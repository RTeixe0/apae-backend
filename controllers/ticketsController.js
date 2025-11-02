import { v4 as uuidv4 } from "uuid";
import { generateQRCodeWithLogo } from "../services/qrService.js";
import db from "../config/mysql.js";

/**
 * 🎟️ Cria um novo ticket (compra do usuário)
 */
export const generateTicket = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { eventId } = req.body;
    const userId = req.user?.id || req.user?.sub;

    if (!eventId) {
      return res.status(400).json({ error: "O campo eventId é obrigatório." });
    }

    const [eventRows] = await connection.query(
      "SELECT id, nome, capacity, sold_count, ticket_price FROM events WHERE id = ?",
      [eventId]
    );
    if (eventRows.length === 0)
      return res.status(404).json({ error: "Evento não encontrado." });

    const event = eventRows[0];
    if (event.sold_count >= event.capacity)
      return res
        .status(400)
        .json({ error: "Capacidade esgotada para este evento." });

    const code = `APAE-${uuidv4().split("-")[0].toUpperCase()}`;
    const qrUrl = await generateQRCodeWithLogo(code);
    const pricePaid = event.ticket_price;

    await connection.beginTransaction();

    const [insertResult] = await connection.query(
      `INSERT INTO tickets 
        (code, event_id, user_id, payment_id, price_paid, status, qr_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [code, eventId, userId, null, pricePaid, "issued", qrUrl]
    );

    await connection.query(
      "UPDATE events SET sold_count = sold_count + 1 WHERE id = ?",
      [eventId]
    );

    await connection.commit();

    res.status(201).json({
      id: insertResult.insertId,
      code,
      qrUrl,
      pricePaid,
      message: "🎟️ Ticket gerado com sucesso!",
    });
  } catch (err) {
    console.error("❌ Erro ao gerar ticket:", err);
    await db.query("ROLLBACK");
    res.status(500).json({ error: "Erro interno ao gerar ticket." });
  } finally {
    connection.release();
  }
};

/**
 * 📋 Lista todos os tickets do usuário logado
 */
export const listUserTickets = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.sub;

    const [rows] = await db.query(
      `SELECT 
         t.id, t.code, t.qr_url, t.status, t.price_paid, t.validated_at,
         e.nome AS event_name, e.data AS event_date, e.local AS event_location
       FROM tickets t
       JOIN events e ON e.id = t.event_id
       WHERE t.user_id = ?
       ORDER BY e.data DESC`,
      [userId]
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Erro ao listar tickets:", err);
    res.status(500).json({ error: "Erro interno ao listar tickets." });
  }
};
