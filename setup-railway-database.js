require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  let connection;
  
  try {
    // Parse DATABASE_URL
    const url = new URL(process.env.DATABASE_URL);
    const config = {
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading '/'
      port: parseInt(url.port || '3306', 10),
      multipleStatements: true // Allow multiple SQL statements
    };

    console.log('🔌 Connecting to Railway database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to Railway database!\n');

    // Read the SQL file
    const sqlFile = path.join(__dirname, 'seoul_surplus.sql');
    let sql = fs.readFileSync(sqlFile, 'utf8');

    // Remove CREATE DATABASE and USE statements (Railway database already exists)
    sql = sql.replace(/CREATE DATABASE IF NOT EXISTS seoul_surplus[\s\S]*?;/g, '');
    sql = sql.replace(/USE seoul_surplus;/g, '');

    // Split by semicolons and filter out empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim().length === 0) continue;

      try {
        // Extract table name from CREATE TABLE statement for logging
        const tableMatch = statement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?/i);
        const tableName = tableMatch ? tableMatch[1] : 'unknown';

        await connection.execute(statement + ';');
        console.log(`✅ Created table: ${tableName}`);
      } catch (error) {
        // If table already exists, that's okay
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message.includes('already exists')) {
          const tableMatch = statement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?/i);
          const tableName = tableMatch ? tableMatch[1] : 'unknown';
          console.log(`⚠️  Table ${tableName} already exists, skipping...`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          // Continue with other statements
        }
      }
    }

    console.log('\n✅ Database setup complete!');
    console.log('📊 Verifying tables...\n');

    // Verify tables were created
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`✅ Found ${tables.length} tables in database:`);
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`   ${index + 1}. ${tableName}`);
    });

    await connection.end();
    console.log('\n🎉 Database setup successful!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

setupDatabase();

