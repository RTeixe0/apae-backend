import db from "../config/mysql.js";

// ✅ POST /events
export const createEvent = async (req, res) => {
  try {
    const { nome, local, data, capacidade, bannerUrl } = req.body;

    if (!nome || !local || !data) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    // ID do usuário autenticado (via Cognito)
    const userId = req.user?.id || req.user?.sub;

    // 🔹 Inserir o evento no MySQL
    const [result] = await db.query(
      "INSERT INTO events (nome, local, data, bannerUrl, organizadorId) VALUES (?, ?, ?, ?, ?)",
      [nome, local, data, bannerUrl || null, userId || null]
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
    // ID do usuário autenticado (pode ser usado para filtrar)
    const userId = req.user?.id || req.user?.sub;

    // 🔹 Buscar todos os eventos (ou só do organizador, se quiser filtrar)
    const [rows] = await db.query(
      "SELECT id, nome, local, data, bannerUrl, organizadorId, created_at FROM events ORDER BY data DESC"
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Erro ao listar eventos:", err);
    res.status(500).json({ error: "Erro interno ao listar eventos." });
  }
};
