import db from '../config/mysql.js';

/**
 * 🔐 Verifica se o usuário pertence a algum grupo permitido
 */
const hasGroup = (req, groupsAllowed) => {
  const userGroups = req.user?.groups || [];
  return groupsAllowed.some((g) => userGroups.includes(g));
};

/**
 * 🧮 Formata data local no padrão YYYY-MM-DD
 */
const formatLocalDate = (dateString) => {
  if (!dateString) return null;

  // Se já está no formato YYYY-MM-DD, não mexe
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * ✅ POST /events
 * Admin e staff podem criar novos eventos
 */
export const createEvent = async (req, res) => {
  try {
    if (!hasGroup(req, ['admin', 'staff'])) {
      return res.status(403).json({
        error: 'Acesso negado. Apenas admin ou staff podem criar eventos.',
      });
    }

    const { nome, local, data, starts_at, ends_at, capacity, bannerUrl, ticket_price, status } =
      req.body;

    if (!nome || !local || !data) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    const formattedDate = formatLocalDate(data);
    if (!formattedDate) {
      return res.status(400).json({
        error: 'Formato de data inválido. Use YYYY-MM-DD.',
      });
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
        capacity || 0,
        0, // sold_count inicial
        ticket_price || 0.0,
        status || 'published',
        userId || null,
      ],
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Evento criado com sucesso!',
    });
  } catch (err) {
    console.error('❌ Erro ao criar evento:', err);
    res.status(500).json({ error: 'Erro interno ao criar evento.' });
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
         e.banner_url AS bannerUrl, e.capacity, e.sold_count, e.ticket_price,
         e.status, e.created_at,
         u.name AS created_by_name
       FROM events e
       LEFT JOIN users u ON u.id = e.created_by
       ORDER BY e.data DESC`,
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Erro ao listar eventos:', err);
    res.status(500).json({ error: 'Erro interno ao listar eventos.' });
  }
};

/**
 * ✅ PUT /events/:id
 * Apenas admin pode editar eventos
 */
export const updateEvent = async (req, res) => {
  try {
    if (!hasGroup(req, ['admin'])) {
      return res.status(403).json({
        error: 'Acesso negado. Apenas administradores podem editar eventos.',
      });
    }

    const { id } = req.params;
    const { nome, local, data, starts_at, ends_at, capacity, bannerUrl, ticket_price, status } =
      req.body;

    // Formata data (se fornecida)
    const formattedDate = data ? formatLocalDate(data) : null;

    // Verifica se o evento existe
    const [exists] = await db.query('SELECT id FROM events WHERE id = ?', [id]);
    if (exists.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    // Atualiza com segurança
    const [result] = await db.query(
      `UPDATE events
       SET nome = COALESCE(?, nome),
           local = COALESCE(?, local),
           data = COALESCE(?, data),
           starts_at = COALESCE(?, starts_at),
           ends_at = COALESCE(?, ends_at),
           capacity = COALESCE(?, capacity),
           banner_url = COALESCE(?, banner_url),
           ticket_price = COALESCE(?, ticket_price),
           status = COALESCE(?, status),
           updated_at = NOW()
       WHERE id = ?`,
      [
        nome || null,
        local || null,
        formattedDate || null,
        starts_at || null,
        ends_at || null,
        capacity || 0,
        bannerUrl || null,
        ticket_price || 0,
        status || 'published',
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    res.status(200).json({ message: 'Evento atualizado com sucesso!' });
  } catch (err) {
    console.error('❌ Erro ao atualizar evento:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar evento.' });
  }
};

/**
 * ✅ DELETE /events/:id
 * Apenas admin pode excluir eventos
 */
export const deleteEvent = async (req, res) => {
  try {
    if (!hasGroup(req, ['admin'])) {
      return res.status(403).json({
        error: 'Acesso negado. Apenas administradores podem excluir eventos.',
      });
    }

    const { id } = req.params;
    const [result] = await db.query('DELETE FROM events WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    res.status(200).json({ message: 'Evento excluído com sucesso!' });
  } catch (err) {
    console.error('❌ Erro ao excluir evento:', err);
    res.status(500).json({ error: 'Erro interno ao excluir evento.' });
  }
};
