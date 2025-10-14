import db from "../config/mysql.js";

// ✅ GET /validate/:code
export const validateTicket = async (req, res) => {
  try {
    const code = req.params.code;
    const [rows] = await db.query("SELECT * FROM tickets WHERE id = ?", [code]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ valid: false, message: "Ingresso não encontrado." });
    }

    const ticket = rows[0];
    if (ticket.usado) {
      return res
        .status(200)
        .json({ valid: false, message: "Ingresso já utilizado." });
    }

    res.status(200).json({ valid: true, ticket });
  } catch (err) {
    console.error("❌ Erro ao validar ingresso:", err);
    res.status(500).json({ error: "Erro ao validar ingresso." });
  }
};

// ✅ POST /scan/:code
export const scanTicket = async (req, res) => {
  try {
    const code = req.params.code;
    const scannerId = req.user?.id || req.user?.sub;

    const [rows] = await db.query("SELECT * FROM tickets WHERE id = ?", [code]);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Ingresso não encontrado." });
    }

    const ticket = rows[0];
    if (ticket.usado) {
      return res
        .status(200)
        .json({ success: false, message: "Ingresso já utilizado." });
    }

    await db.query("UPDATE tickets SET usado = ? WHERE id = ?", [true, code]);
    await db.query(
      "INSERT INTO logs (ticketId, scannerId, timestamp) VALUES (?, ?, ?)",
      [code, scannerId, new Date()]
    );

    res
      .status(200)
      .json({ success: true, message: "Ingresso validado com sucesso." });
  } catch (err) {
    console.error("❌ Erro ao registrar uso:", err);
    res.status(500).json({ error: "Erro ao registrar uso." });
  }
};

// ✅ GET /report/:eventId
export const getEventReport = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const [rows] = await db.query(
      "SELECT usado FROM tickets WHERE eventId = ?",
      [eventId]
    );

    const total = rows.length;
    const usados = rows.filter((t) => t.usado).length;

    res.status(200).json({ eventId, total, usados });
  } catch (err) {
    console.error("❌ Erro ao gerar relatório:", err);
    res.status(500).json({ error: "Erro ao gerar relatório." });
  }
};
