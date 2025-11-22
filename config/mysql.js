// config/mysql.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// 🔧 Cria um pool de conexões (reutilizável e escalável)
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z', // evita deslocamento de horário
  charset: 'utf8mb4', // suporta emojis e acentuação
});

// ----------------------------------------------
// ✅ Teste inicial de conexão (SEM await no topo)
// ----------------------------------------------
async function testConnection() {
  try {
    const [rows] = await db.query('SELECT NOW() AS current_time');
    console.log('🟢 MySQL conectado com sucesso!', rows[0].current_time);
  } catch (err) {
    console.error('❌ Erro ao conectar ao MySQL:', err.message);
  }
}

testConnection();

export default db;
