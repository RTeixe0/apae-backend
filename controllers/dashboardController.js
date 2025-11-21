import db from "../config/mysql.js";

/* ============================================================
   📌 1) OVERVIEW GERAL DO SISTEMA
   /dashboard/overview
   - total de eventos
   - total de tickets
   - total usados / emitidos
   - receita total
============================================================ */
export const getDashboardOverview = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM events) AS total_events,
        (SELECT COUNT(*) FROM tickets) AS total_tickets,
        (SELECT COUNT(*) FROM tickets WHERE status='used') AS total_used,
        (SELECT COUNT(*) FROM tickets WHERE status='issued') AS total_issued,
        (SELECT COALESCE(SUM(price_paid), 0) FROM tickets) AS total_revenue
    `);

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("❌ Erro no getDashboardOverview:", err);
    res.status(500).json({ error: "Erro interno ao carregar overview." });
  }
};


/* ============================================================
   📌 2) DASHBOARD DE TODOS OS EVENTOS
   /dashboard/events
   Usa a view: v_event_sales
============================================================ */
export const getEventsDashboard = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT *
      FROM v_event_sales
      ORDER BY data DESC
    `);

    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Erro no getEventsDashboard:", err);
    res.status(500).json({ error: "Erro ao carregar dados dos eventos." });
  }
};


/* ============================================================
   📌 3) DETALHES DE UM EVENTO
   /dashboard/events/:eventId
   - Dados gerais (view v_event_sales)
   - Dados de checkins (view v_event_checkins)
   - Timeline para gráfico (validations)
============================================================ */
export const getEventDetails = async (req, res) => {
  try {
    const { eventId } = req.params;

    // 1) Dados da view de vendas
    const [sales] = await db.query(
      "SELECT * FROM v_event_sales WHERE event_id = ?",
      [eventId]
    );

    // 2) Dados da view de check-ins
    const [checkins] = await db.query(
      "SELECT * FROM v_event_checkins WHERE event_id = ?",
      [eventId]
    );

    // 3) Timeline para gráfico de check-ins por dia
    const [timeline] = await db.query(
      `
      SELECT
        DATE(v.scanned_at) AS dia,
        COUNT(*) AS scans
      FROM validations v
      JOIN tickets t ON t.id = v.ticket_id
      WHERE t.event_id = ?
      GROUP BY DATE(v.scanned_at)
      ORDER BY dia ASC
      `,
      [eventId]
    );

    res.status(200).json({
      sales: sales[0] || {},
      checkins: checkins[0] || {},
      timeline: timeline || [],
    });
  } catch (err) {
    console.error("❌ Erro no getEventDetails:", err);
    res.status(500).json({ error: "Erro ao carregar detalhes do evento." });
  }
};
