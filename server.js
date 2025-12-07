require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const http = require('http');
const { Server } = require('socket.io');
const { query, testConnection } = require('./config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3000;

const defaultRoles = [
  { name: 'superAdmin', description: 'Super Administrator - Full system access', precedence: 0 },
  { name: 'admin', description: 'Full system access', precedence: 1 },
  { name: 'manager', description: 'Manage inventory and users', precedence: 10 },
  { name: 'regular', description: 'Standard staff access', precedence: 50 }
];

async function ensureDefaultRoles() {
  try {
    const existingRoles = await query('SELECT name FROM roles');
    const existingNames = new Set(existingRoles.map(role => role.name));
    const missingRoles = defaultRoles.filter(role => !existingNames.has(role.name));

    for (const role of missingRoles) {
      await query(
        'INSERT INTO roles (name, description, precedence) VALUES (?, ?, ?)',
        [role.name, role.description, role.precedence]
      );
    }

    if (missingRoles.length > 0) {
      console.log(`🔧 Created default roles: ${missingRoles.map(r => r.name).join(', ')}`);
    }
  } catch (error) {
    console.error('⚠️ Failed to ensure default roles exist:', error.message);
  }
}

async function getRoleIdByName(roleName) {
  await ensureDefaultRoles();

  const matchingRole = await query('SELECT id FROM roles WHERE name = ?', [roleName]);
  if (matchingRole.length > 0) {
    return matchingRole[0].id;
  }

  const fallback = await query('SELECT id FROM roles ORDER BY precedence LIMIT 1');
  if (fallback.length > 0) {
    return fallback[0].id;
  }

  const error = new Error('roles_not_configured');
  throw error;
}

async function getOrCreateCustomerFromPayload(customerPayload = {}) {
  if (!customerPayload) return null;
  if (customerPayload.customer_id) {
    return customerPayload.customer_id;
  }

  const email = (customerPayload.email || '').trim().toLowerCase() || null;

  if (email) {
    const existing = await query('SELECT id FROM customers WHERE email = ?', [email]);
    if (existing.length > 0) {
      return existing[0].id;
    }
  }

  const name = customerPayload.name || '';
  const nameParts = name.split(' ');
  const firstName = customerPayload.first_name || nameParts[0] || 'Customer';
  const lastName = customerPayload.last_name || nameParts.slice(1).join(' ') || '';
  const phone = customerPayload.phone || null;

  const result = await query(`
    INSERT INTO customers (first_name, last_name, email, phone)
    VALUES (?, ?, ?, ?)
  `, [firstName, lastName, email, phone]);

  return result.insertId;
}

// Middleware
app.use(cors());
// Increase JSON body size limit to 10MB to handle base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded images
app.use('/uploads', express.static('uploads'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/images';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: product-timestamp-random.jpg
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Test database connection on startup
testConnection();
ensureDefaultRoles();

// ==================== AUTHENTICATION ENDPOINTS ====================

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const users = await query(
      'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = ?',
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Compare password with bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
    
    // Return user data (without password)
    const { password_hash, ...userData } = user;
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role_name,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existingUsers = await query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Generate username from email (take part before @)
    let username = normalizedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check if username already exists
    const existingUsernames = await query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsernames.length > 0) {
      // If username exists, append a number
      let uniqueUsername = username;
      let counter = 1;
      while (true) {
        uniqueUsername = `${username}${counter}`;
        const check = await query('SELECT id FROM users WHERE username = ?', [uniqueUsername]);
        if (check.length === 0) break;
        counter++;
      }
      username = uniqueUsername;
    }

    // Determine role - always create regular customer accounts
    const roleName = 'regular';
    let roleId;
    try {
      roleId = await getRoleIdByName(roleName);
    } catch (error) {
      if (error.message === 'roles_not_configured') {
        return res.status(500).json({ error: 'No roles configured in database. Please set up roles first.' });
      }
      throw error;
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const userResult = await query(
      `INSERT INTO users (username, email, password_hash, role_id, status) 
       VALUES (?, ?, ?, ?, 'active')`,
      [username, normalizedEmail, password_hash, roleId]
    );

    const userId = userResult.insertId;

    // Insert user profile
    await query(
      `INSERT INTO user_profiles (user_id, full_name, phone, timezone, pref_low_stock, pref_resv) 
       VALUES (?, ?, ?, ?, 1, 1)`,
      [userId, name, null, 'Asia/Seoul']
    );

    // Log activity
    await query(
      `INSERT INTO activity_log (user_id, action, target_type, target_id) 
       VALUES (?, ?, ?, ?)`,
      [userId, 'Account created', 'user', userId.toString()]
    );

    // Get the created user with role info
    const newUsers = await query(
      'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
      [userId]
    );

    const newUser = newUsers[0];
    const { password_hash: _, ...userData } = newUser;

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: userData
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get session/user info
app.get('/api/auth/session', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']; // You'll need to implement proper JWT/auth tokens
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const users = await query(
      'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const { password_hash, ...userData } = user;
    
    res.json({ user: userData });
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== PRODUCTS ENDPOINTS ====================

// Upload product image endpoint
app.post('/api/upload/image', (req, res, next) => {
  upload.single('image')(req, res, function(err) {
    if (err) {
      // Handle multer errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }
      // Handle other errors (like fileFilter errors)
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      console.error('No file received in upload request');
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Verify file was saved
    const fullPath = path.join(req.file.destination, req.file.filename);
    if (!fs.existsSync(fullPath)) {
      console.error('File was not saved to disk:', fullPath);
      return res.status(500).json({ error: 'Failed to save image file' });
    }
    
    // Return the file path relative to the server root
    const imagePath = 'uploads/images/' + req.file.filename;
    console.log('Image uploaded successfully:', imagePath);
    res.json({ 
      success: true, 
      imageUrl: imagePath,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image: ' + error.message });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    let products;

    try {
      // Primary query with all expected columns
      products = await query(`
        SELECT 
          p.id, p.sku, p.name, p.brand, p.category_id, p.type, p.size,
          p.condition_grade, p.retail_price, p.wholesale_price,
          p.stock_quantity, p.low_stock_threshold, p.status, p.created_at, p.updated_at,
          c.name as category_name,
          (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'active'
        ORDER BY p.created_at DESC
      `);
    } catch (primaryError) {
      console.error('Primary products query failed:', primaryError.message);

      // If products table (or related tables) don't exist yet, return empty list instead of 500
      if (primaryError.message && primaryError.message.includes("doesn't exist")) {
        console.warn('products / categories / product_images table missing, returning empty product list');
        return res.json([]);
      }

      // Fallback: more tolerant query that does not assume specific columns exist
      console.warn('Falling back to tolerant products query without wholesale/low_stock/status columns');
      products = await query(`
        SELECT 
          p.*,
          c.name as category_name,
          (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.created_at DESC
      `);
    }
    
    // Debug: Log first product to verify shape
    if (products.length > 0) {
      console.log('Sample product from database:', {
        id: products[0].id,
        name: products[0].name,
        wholesale_price: products[0].wholesale_price,
        low_stock_threshold: products[0].low_stock_threshold,
        status: products[0].status
      });
    }

    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const products = await query(`
      SELECT 
        p.*,
        c.name as category_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.status = 'active'
    `, [id]);

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(products[0]);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const products = await query(`
      SELECT 
        p.*,
        c.name as category_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [id]);

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(products[0]);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const {
      name, brand, category, size,
      condition, price,
      wholesalePrice, stock, lowStockThreshold, image
    } = req.body;

    // Validation
    if (!name || !price || stock === undefined) {
      return res.status(400).json({ error: 'Name, price, and stock are required' });
    }

    // Generate SKU if not provided
    const sku = 'SKU-' + Date.now().toString().slice(-8) + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

    // Get or create category
    let category_id = null;
    if (category) {
      // Check if category exists
      const existingCategories = await query('SELECT id FROM categories WHERE name = ?', [category]);
      if (existingCategories.length > 0) {
        category_id = existingCategories[0].id;
      } else {
        // Create new category
        const categoryResult = await query('INSERT INTO categories (name) VALUES (?)', [category]);
        category_id = categoryResult.insertId;
      }
    }

    // Insert product (try with wholesale_price, fallback if column doesn't exist)
    let result;
    try {
      result = await query(`
        INSERT INTO products (
          sku, name, brand, category_id, size,
          condition_grade, retail_price, wholesale_price,
          stock_quantity, low_stock_threshold, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `, [
        sku, name, brand || null, category_id, size || null,
        condition || 'New', price, wholesalePrice || null,
        stock || 0, lowStockThreshold || 5  // Use provided low_stock_threshold or default to 5
      ]);
    } catch (error) {
      // If wholesale_price column doesn't exist, insert without it
      if (error.message.includes('Unknown column') && error.message.includes('wholesale_price')) {
        console.log('wholesale_price column not found, inserting without it');
        result = await query(`
          INSERT INTO products (
            sku, name, brand, category_id, size,
            condition_grade, retail_price,
            stock_quantity, low_stock_threshold, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `, [
          sku, name, brand || null, category_id, size || null,
          condition || 'New', price,
          stock || 0, lowStockThreshold || 5  // Use provided low_stock_threshold or default to 5
        ]);
      } else {
        throw error;
      }
    }

    const productId = result.insertId;

    // Handle product image if provided (can be base64 or file path)
    if (image && typeof image === 'string' && image.trim()) {
      let imagePath = image;
      
      // Check if image is base64 encoded (starts with data:image/)
      if (image.startsWith('data:image/')) {
        try {
          // Extract mime type and base64 data
          const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
          if (!matches) {
            throw new Error('Invalid base64 image format');
          }
          
          const mimeType = matches[1];
          const base64Data = matches[2];
          
          // Determine file extension from mime type
          const ext = mimeType === 'jpeg' || mimeType === 'jpg' ? 'jpg' :
                     mimeType === 'png' ? 'png' :
                     mimeType === 'gif' ? 'gif' :
                     mimeType === 'webp' ? 'webp' : 'jpg';
          
          // Generate unique filename
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const filename = `product-${uniqueSuffix}.${ext}`;
          const uploadDir = 'uploads/images';
          
          // Ensure upload directory exists
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          // Decode base64 and save to file
          const filePath = path.join(uploadDir, filename);
          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(filePath, buffer);
          
          // Use relative path for database
          imagePath = `uploads/images/${filename}`;
          console.log('Image saved from base64:', imagePath);
        } catch (error) {
          console.error('Error processing base64 image:', error);
          // Continue without image if base64 processing fails
          imagePath = null;
        }
      }
      
      // Insert product image if we have a valid path
      if (imagePath) {
        await query(`
          INSERT INTO product_images (product_id, image_url, is_primary)
          VALUES (?, ?, 1)
        `, [productId, imagePath]);
      }
    }

    // Broadcast product update
    broadcastUpdate('product:created', { id: productId });
    broadcastUpdate('inventory:updated');
    
    res.json({ success: true, id: productId, sku: sku });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = {
      name: req.body.name,
      brand: req.body.brand,
      category_id: req.body.category_id,
      type: req.body.type,
      size: req.body.size,
      condition_grade: req.body.condition_grade,
      retail_price: req.body.retail_price,
      wholesale_price: req.body.wholesale_price !== undefined ? req.body.wholesale_price : null, // Always include, even if undefined
      stock_quantity: req.body.stock_quantity,
      low_stock_threshold: req.body.low_stock_threshold
    };
    
    console.log('Update request body wholesale_price:', req.body.wholesale_price);
    console.log('Update request body low_stock_threshold:', req.body.low_stock_threshold);
    console.log('AllowedFields wholesale_price:', allowedFields.wholesale_price);
    console.log('AllowedFields low_stock_threshold:', allowedFields.low_stock_threshold);

    const updates = [];
    const values = [];

    Object.entries(allowedFields).forEach(([key, value]) => {
      // Handle empty strings for optional fields - convert to null
      if (value === '' || value === null) {
        if (key === 'brand' || key === 'size' || key === 'wholesale_price') {
          value = null;
        } else {
          return; // Skip empty strings for required fields
        }
      }
      
      // Always include optional fields (even if null) to allow clearing them
      if (key === 'wholesale_price' || key === 'brand' || key === 'size') {
        // Always include these fields, even if null
        updates.push(`${key} = ?`);
        values.push(value);
        console.log(`Including ${key} in update:`, value);
      } else if (key === 'low_stock_threshold') {
        // Always include low_stock_threshold if provided (even if 0)
        if (value !== undefined && value !== null && value !== '') {
          var thresholdValue = parseInt(value);
          if (!isNaN(thresholdValue) && thresholdValue >= 0) {
            updates.push(`${key} = ?`);
            values.push(thresholdValue);
            console.log(`Including ${key} in update:`, thresholdValue);
          }
        }
      } else if (value !== undefined && value !== null) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    values.push(id);

    // Try to update with wholesale_price, fallback if column doesn't exist
    try {
      console.log('Executing UPDATE query with fields:', updates);
      console.log('Values:', values);
      await query(`
        UPDATE products SET
          ${updates.join(', ')}
        WHERE id = ?
      `, values);
      console.log('Product updated successfully, ID:', id);
    } catch (error) {
      // If wholesale_price column doesn't exist, remove it and try again
      if (error.message.includes('Unknown column') && error.message.includes('wholesale_price')) {
        console.log('wholesale_price column not found, updating without it');
        const wholesaleIndex = updates.findIndex(u => u.includes('wholesale_price'));
        if (wholesaleIndex !== -1) {
          updates.splice(wholesaleIndex, 1);
          values.splice(wholesaleIndex, 1);
        }
        
        if (updates.length > 0) {
          await query(`
            UPDATE products SET
              ${updates.join(', ')}
            WHERE id = ?
          `, values);
        } else {
          return res.status(400).json({ error: 'No valid fields to update' });
        }
      } else {
        throw error;
      }
    }

    // Update product image if provided (can be base64 or file path)
    console.log('Update product - Image provided:', req.body.image ? 'Yes' : 'No');
    if (req.body.image && typeof req.body.image === 'string' && req.body.image.trim()) {
      let imagePath = req.body.image;
      
      // Check if image is base64 encoded (starts with data:image/)
      if (req.body.image.startsWith('data:image/')) {
        try {
          // Extract mime type and base64 data
          const matches = req.body.image.match(/^data:image\/(\w+);base64,(.+)$/);
          if (!matches) {
            throw new Error('Invalid base64 image format');
          }
          
          const mimeType = matches[1];
          const base64Data = matches[2];
          
          // Determine file extension from mime type
          const ext = mimeType === 'jpeg' || mimeType === 'jpg' ? 'jpg' :
                     mimeType === 'png' ? 'png' :
                     mimeType === 'gif' ? 'gif' :
                     mimeType === 'webp' ? 'webp' : 'jpg';
          
          // Generate unique filename
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const filename = `product-${uniqueSuffix}.${ext}`;
          const uploadDir = 'uploads/images';
          
          // Ensure upload directory exists
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          // Decode base64 and save to file
          const filePath = path.join(uploadDir, filename);
          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(filePath, buffer);
          
          // Use relative path for database
          imagePath = `uploads/images/${filename}`;
          console.log('Image saved from base64:', imagePath);
        } catch (error) {
          console.error('Error processing base64 image:', error);
          // Continue without image if base64 processing fails, but log the error
          console.log('Image processing failed, continuing update without image change');
          imagePath = null;
        }
      }
      
      // Update or insert product image if we have a valid path
      if (imagePath && imagePath.trim()) {
        try {
          // Check if image already exists
          const existingImages = await query(
            'SELECT id FROM product_images WHERE product_id = ? AND is_primary = 1',
            [id]
          );
          
          if (existingImages.length > 0) {
            // Update existing primary image
            await query(
              'UPDATE product_images SET image_url = ? WHERE product_id = ? AND is_primary = 1',
              [imagePath, id]
            );
            console.log('Product image updated in database:', imagePath);
          } else {
            // Insert new primary image
            await query(`
              INSERT INTO product_images (product_id, image_url, is_primary)
              VALUES (?, ?, 1)
            `, [id, imagePath]);
            console.log('Product image inserted into database:', imagePath);
          }
        } catch (imageError) {
          console.error('Error saving product image to database:', imageError);
          // Don't fail the entire update if image save fails
        }
      } else {
        console.log('No image path to save (imagePath is null or empty)');
      }
    }

    // Broadcast product update
    broadcastUpdate('product:updated', { id: id });
    broadcastUpdate('inventory:updated');
    
    res.json({ 
      success: true,
      id: id,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE products SET status = "archived" WHERE id = ?', [id]);
    
    // Broadcast product update
    broadcastUpdate('product:deleted', { id: id });
    broadcastUpdate('inventory:updated');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== RESERVATIONS ENDPOINTS ====================

// Get all reservations
app.get('/api/reservations', async (req, res) => {
  try {
    const reservations = await query(`
      SELECT 
        r.*,
        p.name as product_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url,
        c.first_name, c.last_name, c.email as customer_email,
        u.id as created_by_user_id,
        u.username as created_by_username,
        up.full_name as created_by_name
      FROM reservations r
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      ORDER BY r.reserved_at DESC
    `);

    res.json(reservations);
  } catch (error) {
    console.error('Get reservations error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get reservations for a specific user
app.get('/api/reservations/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    // First get customer_id from user_id
    const users = await query(
      `SELECT u.email FROM users u WHERE u.id = ?`,
      [user_id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const email = users[0].email;
    
    // Get customer_id
    const customers = await query('SELECT id FROM customers WHERE email = ?', [email]);
    if (customers.length === 0) {
      return res.json([]); // No customer record means no reservations
    }
    
    const customer_id = customers[0].id;
    
    // Get reservations for this customer
    const reservations = await query(`
      SELECT 
        r.*,
        p.name as product_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url,
        c.first_name, c.last_name, c.email as customer_email
      FROM reservations r
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN customers c ON r.customer_id = c.id
      WHERE r.customer_id = ?
      ORDER BY r.reserved_at DESC
    `, [customer_id]);

    res.json(reservations);
  } catch (error) {
    console.error('Get user reservations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Decrease product stock
app.post('/api/products/:id/decrease-stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity = 1, reason = 'reservation' } = req.body;
    
    // Extract numeric ID if format is 'p123'
    const productId = id.toString().startsWith('p') ? id.toString().substring(1) : id;
    
    // Check current stock
    const products = await query('SELECT stock_quantity FROM products WHERE id = ?', [productId]);
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const currentStock = products[0].stock_quantity;
    if (currentStock < quantity) {
      return res.status(400).json({ error: `Insufficient stock. Available: ${currentStock}, Requested: ${quantity}` });
    }
    
    // Decrease stock
    await query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [quantity, productId]);
    
    // Log inventory movement
    await query(`
      INSERT INTO inventory_movements (product_id, change_qty, reason, reference_type, reference_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [productId, -quantity, reason, 'reservation', req.body.reference_id || null, req.body.created_by || null]);
    
    // Get updated stock
    const updated = await query('SELECT stock_quantity FROM products WHERE id = ?', [productId]);
    
    // Broadcast inventory update
    broadcastUpdate('inventory:updated');
    broadcastUpdate('product:stock-changed', { id: productId, newStock: updated[0].stock_quantity });
    
    res.json({ success: true, newStock: updated[0].stock_quantity });
  } catch (error) {
    console.error('Decrease stock error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Create reservation
app.post('/api/reservations', async (req, res) => {
  try {
    const { customer_id, product_id, reserved_price, notes, created_by } = req.body;

    // Generate reservation code
    const reservation_code = 'RES-' + Date.now().toString().slice(-8);

    const result = await query(`
      INSERT INTO reservations (reservation_code, customer_id, product_id, reserved_price, notes, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'Pending', ?)
    `, [reservation_code, customer_id, product_id, reserved_price, notes, created_by || null]);

    // Update inventory
    await query(`
      INSERT INTO inventory_movements (product_id, change_qty, reason, reference_type, reference_id, created_by)
      VALUES (?, -1, 'reservation', 'reservation', ?, ?)
    `, [product_id, result.insertId, created_by || null]);

    // Update product stock
    await query('UPDATE products SET stock_quantity = stock_quantity - 1 WHERE id = ?', [product_id]);

    // Broadcast reservation and inventory updates
    broadcastUpdate('reservation:created', { id: result.insertId });
    broadcastUpdate('reservations:updated');
    broadcastUpdate('inventory:updated');
    broadcastUpdate('sales:updated');
    
    res.json({ success: true, id: result.insertId, reservation_code });
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update reservation status
app.put('/api/reservations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await query('UPDATE reservations SET status = ? WHERE id = ?', [status, id]);
    
    // Get reservation details for notification
    const reservations = await query('SELECT customer_id, created_by FROM reservations WHERE id = ?', [id]);
    const reservation = reservations[0];
    
    // Broadcast reservation updates
    broadcastUpdate('reservation:status-changed', { id: id, status: status, customer_id: reservation?.customer_id, created_by: reservation?.created_by });
    broadcastUpdate('reservations:updated');
    broadcastUpdate('sales:updated');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update reservation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== CATEGORIES ENDPOINTS ====================

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await query('SELECT * FROM categories ORDER BY name');
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create category
app.post('/api/categories', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    // Check if category already exists
    const existing = await query('SELECT id FROM categories WHERE name = ?', [name.trim()]);
    if (existing.length > 0) {
      return res.json({ id: existing[0].id, name: name.trim() });
    }
    
    // Create new category
    const result = await query('INSERT INTO categories (name) VALUES (?)', [name.trim()]);
    res.json({ id: result.insertId, name: name.trim() });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// ==================== CUSTOMERS ENDPOINTS ====================

// Get or create customer from user_id
app.get('/api/customers/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    // Get user info
    const users = await query(
      `SELECT u.id, u.email, u.username, up.full_name, up.phone 
       FROM users u 
       LEFT JOIN user_profiles up ON u.id = up.user_id 
       WHERE u.id = ?`,
      [user_id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    const email = user.email;
    
    // Check if customer exists
    const existingCustomers = await query('SELECT id FROM customers WHERE email = ?', [email]);
    
    if (existingCustomers.length > 0) {
      return res.json({ success: true, customer_id: existingCustomers[0].id });
    }
    
    // Create customer from user info
    const nameParts = (user.full_name || user.username || '').split(' ');
    const first_name = nameParts[0] || user.username || 'Customer';
    const last_name = nameParts.slice(1).join(' ') || '';
    
    const result = await query(`
      INSERT INTO customers (first_name, last_name, email, phone)
      VALUES (?, ?, ?, ?)
    `, [first_name, last_name, email, user.phone || null]);
    
    res.json({ success: true, customer_id: result.insertId });
  } catch (error) {
    console.error('Get or create customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { first_name, last_name, email, phone } = req.body;
    
    const result = await query(`
      INSERT INTO customers (first_name, last_name, email, phone)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        phone = VALUES(phone)
    `, [first_name, last_name, email, phone]);

    // Broadcast customer update
    broadcastUpdate('customer:updated', { id: result.insertId });
    
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== INVENTORY ENDPOINTS ====================

// Create inventory movement (idempotent via transaction_id to block duplicates)
app.post('/api/inventory/movements', async (req, res) => {
  try {
    const { product_id, change_qty, reason, reference_type, reference_id, created_by, transaction_id } = req.body;
    
    if (!product_id || change_qty === undefined || !reason) {
      return res.status(400).json({ error: 'product_id, change_qty, and reason are required' });
    }

    // If a transaction_id is provided, check if we've already processed it
    if (transaction_id) {
      const existing = await query(
        'SELECT id FROM inventory_movements WHERE transaction_id = ? LIMIT 1',
        [transaction_id]
      );
      if (existing.length > 0) {
        // Already inserted – return existing id and do NOT create a duplicate row
        return res.json({ success: true, id: existing[0].id, duplicate: true });
      }
    }
    
    const result = await query(`
      INSERT INTO inventory_movements (product_id, change_qty, reason, reference_type, reference_id, transaction_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [product_id, change_qty, reason, reference_type || null, reference_id || null, transaction_id || null, created_by || null]);
    
    // Broadcast inventory movement update
    broadcastUpdate('inventory:movement-created', { id: result.insertId, product_id: product_id });
    broadcastUpdate('inventory:updated');
    
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Create inventory movement error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

app.get('/api/inventory/movements', async (req, res) => {
  try {
    const { product_id, category_id } = req.query;
    let sql = `
      SELECT im.*, p.name as product_name, p.category_id, c.name as category_name, u.username as created_by_name
      FROM inventory_movements im
      JOIN products p ON im.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON im.created_by = u.id
    `;
    const params = [];
    const conditions = [];

    if (product_id) {
      conditions.push('im.product_id = ?');
      params.push(product_id);
    }

    if (category_id) {
      conditions.push('p.category_id = ?');
      params.push(category_id);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY im.created_at DESC LIMIT 100';

    const movements = await query(sql, params);
    res.json(movements);
  } catch (error) {
    console.error('Get inventory movements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== HEALTH CHECK ====================

// ==================== SALES ENDPOINTS ====================

// Get recent manual sales orders
app.get('/api/sales/orders', async (req, res) => {
  try {
    console.log('📥 GET /api/sales/orders - Fetching sales orders...');
    let orders;
    try {
      orders = await query(`
        SELECT 
          so.id,
          so.order_number,
          so.customer_id,
          so.total_amount,
          so.status,
          so.payment_status,
          so.ordered_at,
          COALESCE(CONCAT_WS(' ', c.first_name, c.last_name), 'Walk-in Customer') as customer_name,
          c.email as customer_email,
          c.phone as customer_phone
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        ORDER BY so.ordered_at DESC
        LIMIT 50
      `);
      console.log(`📊 Found ${orders.length} orders in database`);
    } catch (queryError) {
      console.error('❌ Error querying sales_orders table:', queryError);
      console.error('❌ Query error message:', queryError.message);
      console.error('❌ Query error code:', queryError.code);
      // If table doesn't exist, return empty array
      if (queryError.message && queryError.message.includes("doesn't exist")) {
        console.log('⚠️ sales_orders table does not exist, returning empty array');
        return res.json([]);
      }
      throw queryError; // Re-throw if it's a different error
    }

    if (orders.length === 0) {
      console.log('⚠️ No orders found, returning empty array');
      return res.json([]);
    }

    const orderIds = orders.map(order => order.id);
    let orderItems = [];
    
    // Only query order items if we have orders
    if (orderIds.length > 0) {
      try {
        // Handle IN clause properly for MySQL - create placeholders for each ID
        const placeholders = orderIds.map(() => '?').join(',');
        console.log(`🔍 Querying order items for ${orderIds.length} orders`);
        orderItems = await query(`
          SELECT 
            soi.sales_order_id,
            soi.product_id,
            soi.quantity,
            soi.unit_price,
            p.name as product_name,
            c.id as category_id,
            COALESCE(c.name, 'Uncategorized') as category_name
          FROM sales_order_items soi
          JOIN products p ON soi.product_id = p.id
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE soi.sales_order_id IN (${placeholders})
        `, orderIds);
        console.log(`✅ Successfully queried ${orderItems.length} order items`);
      } catch (itemsError) {
        console.error('❌ Error querying order items:', itemsError);
        console.error('❌ Order items error message:', itemsError.message);
        console.error('❌ Order items error stack:', itemsError.stack);
        
        // Try a simpler query as fallback if the main query fails
        if (orderIds.length > 0) {
          try {
            console.log('🔄 Attempting fallback query for order items...');
            const placeholders = orderIds.map(() => '?').join(',');
            orderItems = await query(`
              SELECT 
                soi.sales_order_id,
                soi.product_id,
                soi.quantity,
                soi.unit_price,
                p.name as product_name,
                p.category_id,
                COALESCE(c.name, p.category, 'Uncategorized') as category_name
              FROM sales_order_items soi
              JOIN products p ON soi.product_id = p.id
              LEFT JOIN categories c ON p.category_id = c.id
              WHERE soi.sales_order_id IN (${placeholders})
            `, orderIds);
            console.log(`✅ Fallback query returned ${orderItems.length} order items`);
          } catch (fallbackError) {
            console.error('❌ Fallback query also failed:', fallbackError.message);
            orderItems = [];
          }
        } else {
          orderItems = [];
        }
      }
    }

    console.log(`📦 Found ${orderItems.length} order items`);
    const itemsByOrder = {};
    orderItems.forEach(item => {
      if (!itemsByOrder[item.sales_order_id]) {
        itemsByOrder[item.sales_order_id] = [];
      }
      itemsByOrder[item.sales_order_id].push({
        product_id: item.product_id,
        product_name: item.product_name || 'Product',
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        category_id: item.category_id,
        // Prefer categories table name; fall back to product.category text if needed
        category_name: item.category_name || 'Uncategorized'
      });
    });

    const response = orders.map(order => {
      const orderItems = itemsByOrder[order.id] || [];
      // Log if order has no items for debugging
      if (orderItems.length === 0) {
        console.warn(`⚠️ Order ${order.order_number || order.id} has no items in itemsByOrder`);
      }
      return {
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        total_amount: parseFloat(order.total_amount),
        status: order.status,
        payment_status: order.payment_status,
        ordered_at: order.ordered_at,
        items: orderItems
      };
    });

    console.log(`✅ Returning ${response.length} sales orders`);
    if (response.length > 0) {
      console.log('📋 Sample order:', JSON.stringify(response[0], null, 2));
      console.log('📋 Sample order items count:', response[0].items ? response[0].items.length : 0);
      if (response[0].items && response[0].items.length > 0) {
        console.log('📋 Sample order first item:', JSON.stringify(response[0].items[0], null, 2));
      } else {
        console.warn('⚠️ Sample order has NO items!');
      }
    }
    res.json(response);
  } catch (error) {
    console.error('❌ Get sales orders error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error code:', error.code);
    // Return detailed error in development, generic in production
    const errorDetails = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message + ' (Stack: ' + error.stack.substring(0, 200) + ')';
    res.status(500).json({ error: 'Internal server error', details: errorDetails });
  }
});

// Create manual sales order
app.post('/api/sales/orders', async (req, res) => {
  try {
    const { customer = {}, product_id, quantity = 1, unit_price, total_amount, amount_paid, change_amount, created_by } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    const numericProductId = product_id.toString().startsWith('p')
      ? product_id.toString().substring(1)
      : product_id;

    const qty = parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero' });
    }

    const productsResult = await query(
      'SELECT id, name, stock_quantity, retail_price FROM products WHERE id = ?',
      [numericProductId]
    );
    if (productsResult.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productsResult[0];
    if (product.stock_quantity < qty) {
      return res.status(400).json({
        error: `Insufficient stock. Available: ${product.stock_quantity}, Requested: ${qty}`
      });
    }

    const price = unit_price !== undefined && unit_price !== null
      ? parseFloat(unit_price)
      : parseFloat(product.retail_price || 0);

    if (Number.isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Invalid unit price' });
    }

    const customerId = await getOrCreateCustomerFromPayload(customer);

    const orderNumber = 'SO-' + Date.now().toString().slice(-8);
    // Use provided total_amount or calculate from price * qty
    const totalAmount = total_amount !== undefined ? parseFloat(total_amount) : (price * qty);
    const amountPaid = amount_paid !== undefined ? parseFloat(amount_paid) : totalAmount;
    const changeAmount = change_amount !== undefined ? parseFloat(change_amount) : (amountPaid - totalAmount);

    // Try to insert with payment fields, fallback if columns don't exist
    let orderResult;
    try {
      // First try with payment columns (if they exist)
      orderResult = await query(`
        INSERT INTO sales_orders (order_number, customer_id, total_amount, amount_paid, change_amount, status, payment_status, created_by)
        VALUES (?, ?, ?, ?, ?, 'Paid', 'Paid', ?)
      `, [orderNumber, customerId || null, totalAmount, amountPaid, changeAmount, created_by || null]);
    } catch (error) {
      // If columns don't exist, insert without them
      if (error.message.includes('Unknown column')) {
        console.log('Payment columns not found, storing without them');
        orderResult = await query(`
          INSERT INTO sales_orders (order_number, customer_id, total_amount, status, payment_status, created_by)
          VALUES (?, ?, ?, 'Paid', 'Paid', ?)
        `, [orderNumber, customerId || null, totalAmount, created_by || null]);
      } else {
        throw error;
      }
    }

    const salesOrderId = orderResult.insertId;

    await query(`
      INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price)
      VALUES (?, ?, ?, ?)
    `, [salesOrderId, numericProductId, qty, price]);

    await query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [qty, numericProductId]);

    await query(`
      INSERT INTO inventory_movements (product_id, change_qty, reason, reference_type, reference_id, created_by)
      VALUES (?, ?, 'sale', 'sales_order', ?, ?)
    `, [numericProductId, -qty, salesOrderId, created_by || null]);

    // Broadcast updates
    const newStock = product.stock_quantity - qty;
    broadcastUpdate('sales:updated');
    broadcastUpdate('inventory:updated');
    broadcastUpdate('product:stock-changed', { id: numericProductId, newStock });

    res.json({
      success: true,
      order_id: salesOrderId,
      order_number: orderNumber,
      total_amount: totalAmount,
      amount_paid: amountPaid,
      change_amount: changeAmount
    });
  } catch (error) {
    console.error('Create manual sales order error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Get sales statistics
app.get('/api/sales/statistics', async (req, res) => {
  try {
    const { timeframe = 'daily' } = req.query;
    
    // Get total revenue and sales from confirmed reservations
    let dateFilter = '';
    
    switch(timeframe) {
      case 'daily':
        dateFilter = `DATE(r.reserved_at) = CURDATE()`;
        break;
      case 'weekly':
        dateFilter = `r.reserved_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
        break;
      case 'monthly':
        dateFilter = `r.reserved_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`;
        break;
      case 'yearly':
        dateFilter = `r.reserved_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)`;
        break;
    }
    
    // Get total revenue and sales count from confirmed reservations
    const revenueResult = await query(`
      SELECT 
        COALESCE(SUM(r.reserved_price), 0) as total_revenue,
        COUNT(*) as total_sales
      FROM reservations r
      WHERE r.status = 'Confirmed' AND (${dateFilter})
    `);
    
    const totalRevenue = parseFloat(revenueResult[0]?.total_revenue || 0);
    const totalSales = parseInt(revenueResult[0]?.total_sales || 0);
    
    // Get top products from confirmed reservations
    const topProducts = await query(`
      SELECT 
        p.name as product_name,
        COUNT(r.id) as sales_count,
        SUM(r.reserved_price) as revenue
      FROM reservations r
      JOIN products p ON r.product_id = p.id
      WHERE r.status = 'Confirmed' AND (${dateFilter})
      GROUP BY p.id, p.name
      ORDER BY sales_count DESC
      LIMIT 5
    `);
    
    // Get sales by category
    const categorySales = await query(`
      SELECT 
        COALESCE(c.name, 'Uncategorized') as category_name,
        COUNT(r.id) as sales_count
      FROM reservations r
      JOIN products p ON r.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE r.status = 'Confirmed' AND (${dateFilter})
      GROUP BY c.id, c.name
      ORDER BY sales_count DESC
    `);
    
    // Get sales trend data
    let salesTrend = [];
    let labels = [];
    
    if (timeframe === 'daily') {
      labels = ['6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'];
      const hourlySales = await query(`
        SELECT 
          CASE 
            WHEN HOUR(r.reserved_at) BETWEEN 0 AND 5 THEN 0
            WHEN HOUR(r.reserved_at) BETWEEN 6 AND 8 THEN 1
            WHEN HOUR(r.reserved_at) BETWEEN 9 AND 11 THEN 2
            WHEN HOUR(r.reserved_at) BETWEEN 12 AND 14 THEN 3
            WHEN HOUR(r.reserved_at) BETWEEN 15 AND 17 THEN 4
            WHEN HOUR(r.reserved_at) >= 18 THEN 5
          END as period,
          COALESCE(SUM(r.reserved_price), 0) as revenue
        FROM reservations r
        WHERE r.status = 'Confirmed' AND DATE(r.reserved_at) = CURDATE()
        GROUP BY period
        ORDER BY period
      `);
      salesTrend = [0, 1, 2, 3, 4, 5].map(period => {
        const found = hourlySales.find(h => h.period === period);
        return found ? parseFloat(found.revenue || 0) : 0;
      });
    } else if (timeframe === 'weekly') {
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dailySales = await query(`
        SELECT 
          DAYOFWEEK(r.reserved_at) as day,
          COALESCE(SUM(r.reserved_price), 0) as revenue
        FROM reservations r
        WHERE r.status = 'Confirmed' AND r.reserved_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DAYOFWEEK(r.reserved_at)
        ORDER BY day
      `);
      salesTrend = [1,2,3,4,5,6,7].map(day => {
        const found = dailySales.find(d => d.day === day);
        return found ? parseFloat(found.revenue || 0) : 0;
      });
    } else if (timeframe === 'monthly') {
      labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const weeklySales = await query(`
        SELECT 
          WEEK(r.reserved_at) - WEEK(DATE_SUB(NOW(), INTERVAL 1 MONTH)) + 1 as week,
          COALESCE(SUM(r.reserved_price), 0) as revenue
        FROM reservations r
        WHERE r.status = 'Confirmed' AND r.reserved_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
        GROUP BY WEEK(r.reserved_at)
        ORDER BY week
        LIMIT 4
      `);
      salesTrend = [1,2,3,4].map(week => {
        const found = weeklySales.find(w => w.week === week);
        return found ? parseFloat(found.revenue || 0) : 0;
      });
    } else if (timeframe === 'yearly') {
      labels = ['Q1', 'Q2', 'Q3', 'Q4'];
      const quarterlySales = await query(`
        SELECT 
          QUARTER(r.reserved_at) as quarter,
          COALESCE(SUM(r.reserved_price), 0) as revenue
        FROM reservations r
        WHERE r.status = 'Confirmed' AND r.reserved_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
        GROUP BY QUARTER(r.reserved_at)
        ORDER BY quarter
      `);
      salesTrend = [1,2,3,4].map(q => {
        const found = quarterlySales.find(s => s.quarter === q);
        return found ? parseFloat(found.revenue || 0) : 0;
      });
    }
    
    // Get reservation status counts
    const reservationStatus = await query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM reservations
      WHERE (${dateFilter.replace('r.reserved_at', 'reserved_at')})
      GROUP BY status
    `);
    
    const statusMap = {
      'Pending': 0,
      'Confirmed': 0,
      'Declined': 0,
      'Cancelled': 0
    };
    
    reservationStatus.forEach(row => {
      statusMap[row.status] = parseInt(row.count || 0);
    });
    
    res.json({
      totalRevenue: totalRevenue,
      totalSales: totalSales,
      topProducts: {
        labels: topProducts.map(p => p.product_name || 'Unknown'),
        data: topProducts.map(p => parseInt(p.sales_count || 0))
      },
      categories: {
        labels: categorySales.map(c => c.category_name || 'Uncategorized'),
        data: categorySales.map(c => parseInt(c.sales_count || 0))
      },
      salesTrend: {
        labels: labels,
        data: salesTrend
      },
      reservationStatus: {
        labels: ['Pending', 'Confirmed', 'Declined', 'Cancelled'],
        data: [statusMap.Pending, statusMap.Confirmed, statusMap.Declined, statusMap.Cancelled]
      }
    });
  } catch (error) {
    console.error('Get sales statistics error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Summary of sales totals with timeframe and category filters
app.get('/api/sales/summary', async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const timeframe = req.query.timeframe || 'daily';
    const month = parseInt(req.query.month, 10) || currentMonth;
    const year = parseInt(req.query.year, 10) || currentYear;
    const categoryId = req.query.category_id || null;

    const whereClauses = [`so.status = 'Paid'`];
    const params = [];

    if (timeframe === 'daily') {
      whereClauses.push('DATE(so.ordered_at) = CURDATE()');
    } else if (timeframe === 'monthly') {
      whereClauses.push('YEAR(so.ordered_at) = ?');
      params.push(year);
      whereClauses.push('MONTH(so.ordered_at) = ?');
      params.push(month);
    } else if (timeframe === 'yearly') {
      whereClauses.push('YEAR(so.ordered_at) = ?');
      params.push(year);
    }

    if (categoryId) {
      whereClauses.push('c.id = ?');
      params.push(categoryId);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const summary = await query(`
      SELECT 
        COALESCE(SUM(DISTINCT so.total_amount), 0) AS total_amount,
        COUNT(DISTINCT so.id) AS orders_count
      FROM sales_orders so
      LEFT JOIN sales_order_items soi ON soi.sales_order_id = so.id
      LEFT JOIN products p ON soi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
    `, params);

    const totalAmount = parseFloat(summary[0]?.total_amount || 0);
    const ordersCount = parseInt(summary[0]?.orders_count || 0);

    res.json({
      timeframe,
      month,
      year,
      category_id: categoryId,
      total_amount: totalAmount,
      orders_count: ordersCount
    });
  } catch (error) {
    console.error('Get sales summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await testConnection();
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
  
  // Join room based on user role
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`👤 Socket ${socket.id} joined room: ${room}`);
  });
});

// Helper function to broadcast updates
function broadcastUpdate(event, data, room = null) {
  if (room) {
    io.to(room).emit(event, data);
  } else {
    io.emit(event, data);
  }
}

// Start server
// Use 0.0.0.0 to bind to all network interfaces (required for Railway/cloud hosting)
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📊 API endpoints available at http://${HOST}:${PORT}/api`);
  console.log(`🔌 WebSocket server ready for real-time updates`);
});



