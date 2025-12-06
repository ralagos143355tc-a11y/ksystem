require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, testConnection } = require('./config/database');

// Default super admin credentials
const SUPER_ADMIN_EMAIL = 'superadmin@seoulsurplus.com';
const SUPER_ADMIN_PASSWORD = 'SuperAdmin@2024!'; // This is the password - remember it!
const SUPER_ADMIN_USERNAME = 'superadmin';
const SUPER_ADMIN_NAME = 'Super Administrator';

async function createSuperAdmin() {
  try {
    console.log('🔐 Creating Super Admin Account...\n');

    // Test database connection
    await testConnection();

    // Ensure superAdmin role exists
    console.log('📋 Checking for superAdmin role...');
    const existingRoles = await query('SELECT id, name FROM roles WHERE name = ?', ['superAdmin']);
    
    let superAdminRoleId;
    if (existingRoles.length === 0) {
      // Create superAdmin role with highest precedence (0)
      const result = await query(
        'INSERT INTO roles (name, description, precedence) VALUES (?, ?, ?)',
        ['superAdmin', 'Super Administrator - Full system access', 0]
      );
      superAdminRoleId = result.insertId;
      console.log('✅ Created superAdmin role');
    } else {
      superAdminRoleId = existingRoles[0].id;
      
      console.log('✅ superAdmin role already exists');
    }

    // Check if super admin user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = ?', [SUPER_ADMIN_EMAIL]);
    
    if (existingUser.length > 0) {
      console.log('⚠️  Super admin user already exists!');
      console.log(`   Email: ${SUPER_ADMIN_EMAIL}`);
      console.log('   To reset the password, delete the user first or update manually in the database.\n');
      return;
    }

    // Hash the password
    console.log('🔒 Hashing password...');
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, saltRounds);

    // Insert super admin user
    console.log('👤 Creating super admin user...');
    const userResult = await query(
      `INSERT INTO users (username, email, password_hash, role_id, status) 
       VALUES (?, ?, ?, ?, 'active')`,
      [SUPER_ADMIN_USERNAME, SUPER_ADMIN_EMAIL, password_hash, superAdminRoleId]
    );

    const userId = userResult.insertId;

    // Insert user profile
    await query(
      `INSERT INTO user_profiles (user_id, full_name, timezone, pref_low_stock, pref_resv) 
       VALUES (?, ?, ?, 1, 1)`,
      [userId, SUPER_ADMIN_NAME, 'Asia/Seoul']
    );

    // Log activity
    await query(
      `INSERT INTO activity_log (user_id, action, target_type, target_id) 
       VALUES (?, ?, ?, ?)`,
      [userId, 'Super admin account created', 'user', userId.toString()]
    );

    console.log('\n✅ Super Admin Account Created Successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 Email:    ' + SUPER_ADMIN_EMAIL);
    console.log('🔑 Password: ' + SUPER_ADMIN_PASSWORD);
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n⚠️  IMPORTANT: Save this password securely!');
    console.log('   The password is hashed in the database and cannot be recovered.\n');

  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    process.exit(1);
  }
}

// Run the script
createSuperAdmin()
  .then(() => {
    console.log('✨ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

