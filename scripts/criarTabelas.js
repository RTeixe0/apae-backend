import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function criarTabelas() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  // USERS
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(100),
      email VARCHAR(255) UNIQUE,
      role ENUM('admin', 'user') DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // EVENTS
  await db.query(`
    CREATE TABLE IF NOT EXISTS events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(100),
      local VARCHAR(255),
      data DATE,
      bannerUrl TEXT,
      organizadorId INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // TICKETS
  await db.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      eventId INT,
      tipo VARCHAR(50),
      email VARCHAR(255),
      usado BOOLEAN DEFAULT FALSE,
      qrUrl TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // LOGS
  await db.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticketId INT,
      scannerId VARCHAR(100),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("✅ Tabelas criadas com sucesso no MySQL!");
  process.exit(0);
}

criarTabelas().catch((err) => {
  console.error("❌ Erro ao criar tabelas:", err);
  process.exit(1);
});
