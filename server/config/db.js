import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create MySQL Promise Pool for concurrent query execution
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'eduzenta_db',
  waitForConnections: true,
  connectionLimit: 15,       // up from 10 — handles more concurrent requests
  maxIdle: 10,
  idleTimeout: 60000,
  connectTimeout: 8000,      // down from 20000 — fail fast, don't stall UI for 20s
  queueLimit: 50,            // cap queue depth to prevent memory pressure
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Helper test function to check database connectivity
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return { success: true, message: 'Database connection established successfully.' };
  } catch (error) {
    return { success: false, message: error.message || 'Failed to connect to MySQL database.' };
  }
}

// Automatic Retry Wrapper for MySQL Pool Queries (handles idle socket disconnects / ECONNRESET)
export async function query(sql, params = []) {
  let attempts = 0;
  while (attempts < 3) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      attempts++;
      const isNetworkErr = err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND';
      if (isNetworkErr && attempts < 3) {
        console.warn(`[DB QUERY RETRY] Retrying query after ${err.code} (Attempt ${attempts}/3)...`);
        await new Promise(r => setTimeout(r, 250 * attempts));
      } else {
        throw err;
      }
    }
  }
}

export default pool;
