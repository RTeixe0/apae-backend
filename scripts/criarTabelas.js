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
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      role ENUM('admin','user') DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // EVENTS
  await db.query(`
    CREATE TABLE IF NOT EXISTS events (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      local VARCHAR(255) NOT NULL,
      data DATE NOT NULL,
      bannerUrl TEXT,
      organizadorId INT,
      capacidade INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (organizadorId),
      FOREIGN KEY (organizadorId) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // TICKETS
  await db.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) UNIQUE,
      eventId INT NOT NULL,
      tipo VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      usado TINYINT(1) DEFAULT 0,
      qrUrl TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (eventId),
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // LOGS
  await db.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      ticketId INT NOT NULL,
      scannerId VARCHAR(100),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (ticketId),
      FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log("✅ Todas as tabelas foram criadas com sucesso!");
  await db.end();
}

criarTabelas().catch((err) => {
  console.error("❌ Erro ao criar tabelas:", err);
  process.exit(1);
});
