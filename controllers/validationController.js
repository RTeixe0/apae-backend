import db from "../config/mysql.js";

/**
 * ✅ GET /validate/:code
 * Verifica se o ingresso existe e se já foi utilizado.
 */
export const validateTicket = async (req, res) => {
  try {
    const { code } = req.params;

    const [rows] = await db.query(
      `SELECT 
         t.id, t.code, t.status, t.price_paid, t.validated_at,
         e.nome AS event_name, e.local AS event_location, e.data AS event_date
       FROM tickets t
       JOIN events e ON e.id = t.event_id
       WHERE t.code = ?`,
      [code]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ valid: false, message: "🎟️ Ingresso não encontrado." });
    }

    const ticket = rows[0];
    if (ticket.status === "used") {
      return res
        .status(200)
        .json({ valid: false, message: "⚠️ Ingresso já utilizado.", ticket });
    }

    res.status(200).json({
      valid: true,
      message: "✅ Ingresso válido e ainda não utilizado.",
      ticket,
    });
  } catch (err) {
    console.error("❌ Erro ao validar ingresso:", err);
    res.status(500).json({ error: "Erro interno ao validar ingresso." });
  }
};

/**
 * 🧾 POST /scan/:code
 * Realiza o check-in (validação efetiva) e grava no histórico `validations`
 */
export const scanTicket = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { code } = req.params;
    const scannerId = req.user?.id || null;
    const userGroups = req.user?.groups || [];

    if (!userGroups.includes("admin") && !userGroups.includes("staff")) {
      return res.status(403).json({
        success: false,
        message: "Apenas admin ou staff podem validar ingressos.",
      });
    }

    const [rows] = await connection.query(
      "SELECT id, status, event_id FROM tickets WHERE code = ?",
      [code]
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "🎟️ Ingresso não encontrado." });
    }

    const ticket = rows[0];
    if (ticket.status === "used") {
      return res
        .status(400)
        .json({ success: false, message: "⚠️ Ingresso já utilizado." });
    }

    await connection.beginTransaction();

    // Marca ticket como usado
    await connection.query(
      `UPDATE tickets 
       SET status='used', validated_at=NOW(), validated_by=? 
       WHERE id=?`,
      [scannerId, ticket.id]
    );

    // Grava histórico de validação
    await connection.query(
      `INSERT INTO validations (ticket_id, scanner_id, scanned_at, location, meta_json)
       VALUES (?, ?, NOW(), ?, JSON_OBJECT('source','api','ip',?))`,
      [ticket.id, scannerId, req.body.location || null, req.ip]
    );

    await connection.commit();

    res.status(200).json({
      success: true,
      message: "✅ Ingresso validado com sucesso!",
    });
  } catch (err) {
    console.error("❌ Erro ao registrar validação:", err);
    await db.query("ROLLBACK");
    res.status(500).json({ error: "Erro ao registrar validação." });
  } finally {
    connection.release();
  }
};

/**
 * 📊 GET /report/:eventId
 * Gera um relatório do evento (total, usados, restantes)
 */
export const getEventReport = async (req, res) => {
  try {
    const { eventId } = req.params;

    const [rows] = await db.query(
      `SELECT 
         COUNT(*) AS total,
         SUM(CASE WHEN status='used' THEN 1 ELSE 0 END) AS usados
       FROM tickets
       WHERE event_id = ?`,
      [eventId]
    );

    const stats = rows[0];
    stats.restantes = stats.total - stats.usados;

    res.status(200).json({
      eventId,
      total: stats.total,
      usados: stats.usados,
      restantes: stats.restantes,
    });
  } catch (err) {
    console.error("❌ Erro ao gerar relatório:", err);
    res.status(500).json({ error: "Erro interno ao gerar relatório." });
  }
};
