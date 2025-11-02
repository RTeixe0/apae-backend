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
 * Evita o problema de timezone (UTC-3 → data do dia anterior)
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

    const { nome, local, data, capacidade, bannerUrl } = req.body;

    if (!nome || !local || !data) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    // 🔧 Formatar data corretamente no fuso local
    const formattedDate = formatLocalDate(data);
    if (!formattedDate) {
      return res
        .status(400)
        .json({ error: "Formato de data inválido. Use YYYY-MM-DD." });
    }

    const userId = req.user?.id || req.user?.sub;

    const [result] = await db.query(
      "INSERT INTO events (nome, local, data, capacidade, bannerUrl, organizadorId) VALUES (?, ?, ?, ?, ?, ?)",
      [
        nome,
        local,
        formattedDate,
        capacidade || 0,
        bannerUrl || null,
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
 * Todos os usuários autenticados podem ver eventos
 */
export const listEvents = async (_req, res) => {
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
    const { nome, local, data, capacidade, bannerUrl } = req.body;

    let formattedDate = null;
    if (data) {
      formattedDate = formatLocalDate(data);
      if (!formattedDate) {
        return res
          .status(400)
          .json({ error: "Formato de data inválido. Use YYYY-MM-DD." });
      }
    }

    const [result] = await db.query(
      "UPDATE events SET nome=?, local=?, data=?, capacidade=?, bannerUrl=? WHERE id=?",
      [nome, local, formattedDate, capacidade, bannerUrl, id]
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
