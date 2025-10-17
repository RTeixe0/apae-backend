import db from "../config/mysql.js";

// ✅ POST /events
export const createEvent = async (req, res) => {
  try {
    const { nome, local, data, capacidade, bannerUrl } = req.body;

    if (!nome || !local || !data) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    const userId = req.user?.id || req.user?.sub;

    const [result] = await db.query(
      "INSERT INTO events (nome, local, data, capacidade, bannerUrl, organizadorId) VALUES (?, ?, ?, ?, ?, ?)",
      [nome, local, data, capacidade || 0, bannerUrl || null, userId || null]
    );

    res.status(201).json({
      id: result.insertId,
      message: "Evento criado com sucesso!",
    });
  } catch (err) {
    console.error("❌ Erro ao criar evento:", err);
    res.status(500).json({ error: "Erro interno ao criar evento." });
  }
};

// ✅ GET /events
export const listEvents = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nome, local, data, capacidade, bannerUrl, organizadorId, created_at FROM events ORDER BY data DESC"
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Erro ao listar eventos:", err);
    res.status(500).json({ error: "Erro interno ao listar eventos." });
  }
};
