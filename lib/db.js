// lib/db.js
import mysql from 'serverless-mysql';

const db = mysql({
  config: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectTimeout: 10000, // 10 seconds
    waitForConnections: true,
    connectionLimit: 10,
  }
});

// Add connection verification
const verifyConnection = async () => {
  try {
    await db.query('SELECT 1');
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

// Wrap the db object to include connection verification
const wrappedDb = {
  ...db,
  query: async (...args) => {
    await verifyConnection();
    return db.query(...args);
  }
};

export default wrappedDb;