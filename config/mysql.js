// config/mysql.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  charset: 'utf8mb4',
});

// Teste inicial SEM await no topo
(async () => {
  try {
    const [rows] = await db.query('SELECT NOW() AS current_time');
    console.log('🟢 MySQL OK:', rows[0].current_time);
  } catch (err) {
    console.error('❌ Erro MySQL:', err.message);
  }
})();

export default db;
