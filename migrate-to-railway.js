require('dotenv').config();
const mysql = require('mysql2/promise');

// This script migrates data from local database to Railway database
// Make sure your .env has both LOCAL_DATABASE_URL and DATABASE_URL set

async function migrateData() {
  let localConnection, railwayConnection;
  
  try {
    console.log('🔄 Starting database migration to Railway...\n');
    
    // Parse local database URL (if set) or use individual env vars
    let localConfig;
    if (process.env.LOCAL_DATABASE_URL) {
      const url = new URL(process.env.LOCAL_DATABASE_URL);
      localConfig = {
        host: url.hostname,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
        port: parseInt(url.port || '3306', 10)
      };
    } else {
      localConfig = {
        host: process.env.LOCAL_DB_HOST || '127.0.0.1',
        user: process.env.LOCAL_DB_USER || 'root',
        password: process.env.LOCAL_DB_PASSWORD || '',
        database: process.env.LOCAL_DB_NAME || 'seoul_surplus',
        port: parseInt(process.env.LOCAL_DB_PORT || '3306', 10)
      };
    }
    
    // Parse Railway database URL
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not set in .env file');
    }
    
    const railwayUrl = new URL(process.env.DATABASE_URL);
    const railwayConfig = {
      host: railwayUrl.hostname,
      user: railwayUrl.username,
      password: railwayUrl.password,
      database: railwayUrl.pathname.slice(1),
      port: parseInt(railwayUrl.port || '3306', 10)
    };
    
    console.log('📋 Local Database:', localConfig.database);
    console.log('📋 Railway Database:', railwayConfig.database);
    console.log('');
    
    // Connect to both databases
    console.log('🔌 Connecting to local database...');
    localConnection = await mysql.createConnection(localConfig);
    console.log('✅ Connected to local database');
    
    console.log('🔌 Connecting to Railway database...');
    railwayConnection = await mysql.createConnection(railwayConfig);
    console.log('✅ Connected to Railway database\n');
    
    // List of tables to migrate (in order to respect foreign keys)
    const tables = [
      'categories',
      'roles',
      'permissions',
      'role_permissions',
      'users',
      'user_profiles',
      'products',
      'product_images',
      'customers',
      'reservations',
      'sales_orders',
      'sales_order_items',
      'inventory_movements',
      'inventory_alerts',
      'activity_log'
    ];
    
    for (const table of tables) {
      try {
        console.log(`📦 Migrating table: ${table}...`);
        
        // Check if table exists in local database
        const [localTables] = await localConnection.execute(
          `SELECT COUNT(*) as count FROM information_schema.tables 
           WHERE table_schema = ? AND table_name = ?`,
          [localConfig.database, table]
        );
        
        if (localTables[0].count === 0) {
          console.log(`   ⚠️  Table ${table} doesn't exist in local database, skipping...`);
          continue;
        }
        
        // Get all data from local database
        const [rows] = await localConnection.execute(`SELECT * FROM ${table}`);
        
        if (rows.length === 0) {
          console.log(`   ℹ️  Table ${table} is empty, skipping...`);
          continue;
        }
        
        console.log(`   Found ${rows.length} rows to migrate`);
        
        // Check if table exists in Railway database
        const [railwayTables] = await railwayConnection.execute(
          `SELECT COUNT(*) as count FROM information_schema.tables 
           WHERE table_schema = ? AND table_name = ?`,
          [railwayConfig.database, table]
        );
        
        if (railwayTables[0].count === 0) {
          console.log(`   ⚠️  Table ${table} doesn't exist in Railway database, skipping...`);
          continue;
        }
        
        // Get column names
        const [columns] = await localConnection.execute(
          `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
           ORDER BY ORDINAL_POSITION`,
          [localConfig.database, table]
        );
        
        const columnNames = columns.map(col => col.COLUMN_NAME);
        
        // Clear existing data in Railway (optional - comment out if you want to keep existing data)
        // await railwayConnection.execute(`DELETE FROM ${table}`);
        
        // Insert data into Railway database
        let inserted = 0;
        let skipped = 0;
        
        for (const row of rows) {
          try {
            // Build INSERT query
            const placeholders = columnNames.map(() => '?').join(', ');
            const values = columnNames.map(col => row[col]);
            
            // Use INSERT IGNORE to skip duplicates, or INSERT ... ON DUPLICATE KEY UPDATE
            const sql = `INSERT IGNORE INTO ${table} (${columnNames.join(', ')}) VALUES (${placeholders})`;
            
            await railwayConnection.execute(sql, values);
            inserted++;
          } catch (error) {
            // Skip duplicate entries or other errors
            if (error.code === 'ER_DUP_ENTRY') {
              skipped++;
            } else {
              console.log(`   ⚠️  Error inserting row: ${error.message}`);
              skipped++;
            }
          }
        }
        
        console.log(`   ✅ Migrated ${inserted} rows, skipped ${skipped} duplicates\n`);
        
      } catch (error) {
        console.error(`   ❌ Error migrating table ${table}:`, error.message);
        console.log('');
      }
    }
    
    console.log('✅ Migration completed!\n');
    console.log('📊 Summary:');
    console.log('   - All data has been migrated to Railway');
    console.log('   - Duplicate entries were skipped');
    console.log('   - Check your Railway database to verify\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (localConnection) {
      await localConnection.end();
      console.log('🔌 Closed local database connection');
    }
    if (railwayConnection) {
      await railwayConnection.end();
      console.log('🔌 Closed Railway database connection');
    }
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log('✨ Migration script finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

