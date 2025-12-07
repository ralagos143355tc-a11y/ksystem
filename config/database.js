require('dotenv').config();
const mysql = require('mysql2/promise');

// Parse database configuration from environment variables
// Supports both DATABASE_URL (connection string) and individual variables
let dbConfig = {};

if (process.env.DATABASE_URL) {
  // Parse MySQL connection string: mysql://user:password@host:port/database
  const url = new URL(process.env.DATABASE_URL);
  dbConfig = {
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1), // Remove leading '/'
    port: parseInt(url.port || '3306', 10),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
} else {
  // Use individual environment variables
  let dbHost = process.env.DB_HOST || '127.0.0.1';
  // Convert localhost to 127.0.0.1 to avoid IPv6 issues
  if (dbHost === 'localhost') {
    dbHost = '127.0.0.1';
  }

  dbConfig = {
    host: dbHost,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seoul_surplus',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Query helper function
async function query(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
}

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Database connected successfully!');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

module.exports = {
  query,
  testConnection,
  pool
};

