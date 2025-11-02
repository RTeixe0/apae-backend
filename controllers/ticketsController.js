import { v4 as uuidv4 } from "uuid";
import { generateQRCodeWithLogo } from "../services/qrService.js";
import db from "../config/mysql.js";

/**
 * 🎟️ Cria um ou mais tickets (compra do usuário)
 */
export const generateTicket = async (req, res) => {
  const connection = await db.getConnection();
  try {
    let { eventId, buyerEmail, quantity = 1 } = req.body;
    const userId = req.user?.id || req.user?.sub;

    // 🔸 Garantir número inteiro válido
    quantity = Number(quantity);
    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({
        error: "A quantidade de ingressos deve ser um número positivo.",
      });
    }

    if (!eventId || !buyerEmail) {
      return res.status(400).json({
        error: "Campos obrigatórios ausentes (eventId e buyerEmail).",
      });
    }

    // 🔹 Busca informações do evento
    const [eventRows] = await connection.query(
      `SELECT id, nome, capacity, sold_count, ticket_price 
       FROM events 
       WHERE id = ?`,
      [eventId]
    );

    if (eventRows.length === 0) {
      return res.status(404).json({ error: "Evento não encontrado." });
    }

    const event = eventRows[0];

    // 🔹 Verifica capacidade disponível
    const remaining = event.capacity - event.sold_count;
    if (remaining <= 0) {
      return res
        .status(400)
        .json({ error: "Capacidade esgotada para este evento." });
    }

    if (quantity > remaining) {
      return res.status(400).json({
        error: `Apenas ${remaining} ingressos restantes para este evento.`,
      });
    }

    // 🔹 Inicia transação
    await connection.beginTransaction();

    const ticketsGenerated = [];
    const ticketPrice = Number(event.ticket_price);
    const totalPaid = ticketPrice * quantity;

    // 🔹 Gera cada ticket individualmente
    for (let i = 0; i < quantity; i++) {
      const code = `APAE-${uuidv4().split("-")[0].toUpperCase()}`;
      const qrUrl = await generateQRCodeWithLogo(code);

      const [insertResult] = await connection.query(
        `INSERT INTO tickets 
          (code, event_id, user_id, buyer_email, payment_id, price_paid, status, qr_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code,
          eventId,
          userId || null,
          buyerEmail,
          null, // 🔸 Placeholder para ID de pagamento externo futuro
          ticketPrice,
          "issued",
          qrUrl,
        ]
      );

      ticketsGenerated.push({
        id: insertResult.insertId,
        code,
        qrUrl,
        pricePaid: ticketPrice,
      });
    }

    // 🔹 Atualiza contador de ingressos vendidos
    await connection.query(
      "UPDATE events SET sold_count = sold_count + ? WHERE id = ?",
      [quantity, eventId]
    );

    await connection.commit();

    // 🔹 Resposta final
    res.status(201).json({
      message: "🎟️ Tickets gerados com sucesso!",
      event: {
        id: eventId,
        nome: event.nome,
      },
      totalGenerated: quantity,
      totalPaid,
      unitPrice: ticketPrice,
      tickets: ticketsGenerated,
    });
  } catch (err) {
    console.error("❌ Erro ao gerar ticket:", err);
    await connection.rollback();
    res.status(500).json({ error: "Erro interno ao gerar tickets." });
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

    if (!userId) {
      return res
        .status(401)
        .json({ error: "Usuário não autenticado ou token inválido." });
    }

    const [rows] = await db.query(
      `SELECT 
         t.id, t.code, t.qr_url, t.status, t.price_paid, t.validated_at,
         t.buyer_email,
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
