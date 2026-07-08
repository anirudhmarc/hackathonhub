import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: 'aws-malaysia-ai-hackathon-aurora-mysql-308-db-instance-1.c3mag84cytah.us-east-1.rds.amazonaws.com',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'hackathon_scoring',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    connection.release();
    return true;
  } catch (error) {
    return false;
  }
}

export { pool, testConnection };
