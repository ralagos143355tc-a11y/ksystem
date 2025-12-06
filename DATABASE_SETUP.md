# Database Connection Setup Guide

This guide will walk you through connecting your Seoul Surplus application to a MySQL database.

## Prerequisites

1. **MySQL Server** installed and running
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Or use XAMPP/WAMP which includes MySQL

2. **Node.js** installed (version 14 or higher)
   - Download from: https://nodejs.org/

## Step 1: Set Up MySQL Database

1. **Start MySQL Server**
   - If using XAMPP: Start MySQL from XAMPP Control Panel
   - If using standalone MySQL: Start MySQL service

2. **Create the Database**
   ```bash
   # Open MySQL command line or phpMyAdmin
   mysql -u root -p
   ```

3. **Import the Database Schema**
   ```bash
   # In MySQL command line:
   source seoul_surplus.sql
   
   # Or using command line:
   mysql -u root -p < seoul_surplus.sql
   ```

4. **Verify Database Created**
   ```sql
   USE seoul_surplus;
   SHOW TABLES;
   ```

## Step 2: Install Node.js Dependencies

1. **Open Terminal/Command Prompt** in your project folder (`C:\Users\User\Documents\HAHA`)

2. **Install dependencies:**
   ```bash
   npm install
   ```

   This will install:
   - `express` - Web server framework
   - `mysql2` - MySQL database driver
   - `cors` - Enable cross-origin requests
   - `dotenv` - Environment variables
   - `bcryptjs` - Password hashing

## Step 3: Configure Database Connection

1. **Create `.env` file** in your project root:
   ```bash
   # Copy the example file
   copy .env.example .env
   ```

2. **Edit `.env` file** with your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=seoul_surplus
   PORT=3000
   NODE_ENV=development
   ```

   **Important:** Replace `your_mysql_password` with your actual MySQL root password.

## Step 4: Start the Backend Server

1. **Start the server:**
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

2. **Verify it's working:**
   - You should see: `🚀 Server running on http://localhost:3000`
   - You should see: `✅ Database connected successfully!`
   - Open browser: http://localhost:3000/api/health

## Step 5: Update Frontend to Use API

The frontend currently uses `localStorage`. You'll need to update your JavaScript files to make API calls instead.

### Example: Update `user.js` to fetch products from API

Replace the hardcoded products array with an API call:

```javascript
// Instead of:
var products = [/* hardcoded data */];

// Use:
var products = [];

async function loadProducts() {
  try {
    const response = await fetch('http://localhost:3000/api/products');
    products = await response.json();
    renderProducts();
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

// Call on page load
loadProducts();
```

## Step 6: Test the Connection

1. **Test API endpoints:**
   - Products: http://localhost:3000/api/products
   - Categories: http://localhost:3000/api/categories
   - Health: http://localhost:3000/api/health

2. **Check database:**
   ```sql
   SELECT * FROM products;
   SELECT * FROM users;
   ```

## Troubleshooting

### Error: "Cannot connect to database"
- ✅ Check MySQL is running
- ✅ Verify credentials in `.env` file
- ✅ Check database name is correct: `seoul_surplus`

### Error: "Access denied for user"
- ✅ Verify MySQL username and password
- ✅ Check user has permissions to access database

### Error: "Table doesn't exist"
- ✅ Make sure you imported `seoul_surplus.sql`
- ✅ Verify database name matches in `.env`

### Port already in use
- ✅ Change `PORT` in `.env` to a different number (e.g., 3001)
- ✅ Or stop the process using port 3000

## Next Steps

1. **Populate initial data:**
   - Add categories
   - Add products
   - Create user accounts

2. **Update all frontend files:**
   - Replace `localStorage` calls with API calls
   - Update `auth.js` to use `/api/auth/login`
   - Update `user.js` to use `/api/products`
   - Update `admin.js` to use API endpoints

3. **Add authentication:**
   - Implement JWT tokens for secure authentication
   - Add session management

4. **Add password hashing:**
   - Use bcryptjs to hash passwords before storing
   - Update login to compare hashed passwords

## API Endpoints Reference

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/reservations` - Get all reservations
- `POST /api/reservations` - Create reservation
- `GET /api/categories` - Get all categories
- `POST /api/customers` - Create customer
- `POST /api/auth/login` - Login user
- `GET /api/health` - Health check

## Need Help?

If you encounter issues:
1. Check the server console for error messages
2. Verify MySQL is running
3. Check database credentials
4. Ensure all dependencies are installed




