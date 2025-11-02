import db from "../config/mysql.js";

/**
 * 🔐 Função auxiliar: verifica se o usuário pertence a algum grupo permitido
 */
const hasGroup = (req, groupsAllowed) => {
  const userGroups = req.user?.groups || [];
  return groupsAllowed.some((g) => userGroups.includes(g));
};

/**
 * 🧮 Função para formatar data local (YYYY-MM-DD)
 */
const formatLocalDate = (dateString) => {
  const d = new Date(dateString);
  if (isNaN(d)) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * ✅ POST /events
 * Apenas admin e staff podem criar eventos
 */
export const createEvent = async (req, res) => {
  try {
    if (!hasGroup(req, ["admin", "staff"])) {
      return res.status(403).json({
        error: "Acesso negado. Apenas admin ou staff podem criar eventos.",
      });
    }

    const {
      nome,
      local,
      data,
      starts_at,
      ends_at,
      capacidade,
      bannerUrl,
      ticket_price,
    } = req.body;

    if (!nome || !local || !data) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    const formattedDate = formatLocalDate(data);
    if (!formattedDate) {
      return res
        .status(400)
        .json({ error: "Formato de data inválido. Use YYYY-MM-DD." });
    }

    const userId = req.user?.id || req.user?.sub;

    const [result] = await db.query(
      `INSERT INTO events 
        (nome, local, data, starts_at, ends_at, banner_url, capacity, sold_count, ticket_price, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nome,
        local,
        formattedDate,
        starts_at || null,
        ends_at || null,
        bannerUrl || null,
        capacidade || 0,
        0, // sold_count inicial
        ticket_price || 0.0,
        "published",
        userId || null,
      ]
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

/**
 * ✅ GET /events
 * Todos os usuários autenticados podem visualizar
 */
export const listEvents = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         e.id, e.nome, e.local, e.data, e.starts_at, e.ends_at,
         e.banner_url, e.capacity, e.sold_count, e.ticket_price,
         e.status, e.created_at,
         u.name AS created_by_name
       FROM events e
       LEFT JOIN users u ON u.id = e.created_by
       ORDER BY e.data DESC`
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Erro ao listar eventos:", err);
    res.status(500).json({ error: "Erro interno ao listar eventos." });
  }
};

/**
 * ✅ PUT /events/:id
 * Apenas admin pode editar eventos
 */
export const updateEvent = async (req, res) => {
  try {
    if (!hasGroup(req, ["admin"])) {
      return res.status(403).json({
        error: "Acesso negado. Apenas administradores podem editar eventos.",
      });
    }

    const { id } = req.params;
    const {
      nome,
      local,
      data,
      starts_at,
      ends_at,
      capacidade,
      bannerUrl,
      ticket_price,
      status,
    } = req.body;

    const formattedDate = data ? formatLocalDate(data) : null;

    const [result] = await db.query(
      `UPDATE events 
       SET nome=?, local=?, data=?, starts_at=?, ends_at=?, 
           capacity=?, banner_url=?, ticket_price=?, status=?
       WHERE id=?`,
      [
        nome,
        local,
        formattedDate,
        starts_at || null,
        ends_at || null,
        capacidade,
        bannerUrl || null,
        ticket_price || 0,
        status || "published",
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Evento não encontrado." });
    }

    res.status(200).json({ message: "Evento atualizado com sucesso!" });
  } catch (err) {
    console.error("❌ Erro ao atualizar evento:", err);
    res.status(500).json({ error: "Erro interno ao atualizar evento." });
  }
};

/**
 * ✅ DELETE /events/:id
 * Apenas admin pode excluir eventos
 */
export const deleteEvent = async (req, res) => {
  try {
    if (!hasGroup(req, ["admin"])) {
      return res.status(403).json({
        error: "Acesso negado. Apenas administradores podem excluir eventos.",
      });
    }

    const { id } = req.params;
    const [result] = await db.query("DELETE FROM events WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Evento não encontrado." });
    }

    res.status(200).json({ message: "Evento excluído com sucesso!" });
  } catch (err) {
    console.error("❌ Erro ao excluir evento:", err);
    res.status(500).json({ error: "Erro interno ao excluir evento." });
  }
};
