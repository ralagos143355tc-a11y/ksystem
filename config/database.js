require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration from environment variables
// Force IPv4 by using 127.0.0.1 instead of localhost
let dbHost = process.env.DB_HOST || '127.0.0.1';
// Convert localhost to 127.0.0.1 to avoid IPv6 issues
if (dbHost === 'localhost') {
  dbHost = '127.0.0.1';
}

const dbConfig = {
  host: dbHost,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'seoul_surplus',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Force IPv4
  family: 4
};

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

