import mysql from "mysql2/promise";

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

try {
  const [rows] = await db.query("SELECT NOW() AS current_time");
  console.log("OK:", rows);
} catch (err) {
  console.log("ERRO:", err);
}
