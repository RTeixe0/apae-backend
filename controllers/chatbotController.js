import { GoogleGenAI } from '@google/genai';
import db from '../config/mysql.js';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function normalizeToISO(value) {
  if (!value) return null;

  // Se já é string: ok
  if (typeof value === 'string') return value;

  // Se é Date: converter para YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
  if (value instanceof Date) {
    return value.toISOString().split('.')[0]; // remove milissegundos
  }

  return null;
}

function getHojeBrasilISO() {
  const now = new Date();

  // Ajuste manual para UTC-3 (Brasil)
  const utc3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  return utc3.toISOString().split('T')[0];
}

function formatDate(value) {
  if (!value) return 'Não informado';

  const iso = normalizeToISO(value);
  if (!iso) return 'Não informado';

  const d = new Date(iso.split('T')[0]); // apenas a parte da data
  if (isNaN(d.getTime())) return 'Não informado';

  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(value) {
  if (!value) return 'Não informado';

  // Se for string no padrão HH:MM:SS
  if (typeof value === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(value)) {
    const [hh, mm] = value.split(':');
    return `${hh}:${mm}`;
  }

  // Se vier como Date (casos raros)
  if (value instanceof Date) {
    const hh = String(value.getHours()).padStart(2, '0');
    const mm = String(value.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  return 'Não informado';
}

// Formata preço para "R$ 80,00"
function formatPrice(value) {
  if (value == null) return 'R$ 0,00';

  const num = parseFloat(value);
  if (isNaN(num)) return 'R$ 0,00';

  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function buildPrompt(eventos, eventosHoje, userMessage, hoje) {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
Você é o Assistente Virtual Oficial do aplicativo APAE Eventos.

Sua função é responder perguntas sobre os eventos cadastrados neste sistema.
Você deve sempre basear suas respostas EXCLUSIVAMENTE nos dados exibidos abaixo.

INSTRUÇÕES IMPORTANTES:
- Nunca invente informações que não estejam listadas nos eventos.
- Se não houver dados suficientes, responda exatamente:
  "Não encontrei essa informação no sistema."
- Fale sempre de forma clara, objetiva e educada.
- A data de hoje é: ${hoje}
- Quando o usuário perguntar por eventos de hoje, compare a data ${hoje}
  com a data de cada evento.
- Se houver vários eventos relevantes, explique de forma organizada.

EVENTOS DE HOJE:
${
  eventosHoje.length === 0
    ? 'Nenhum evento está programado para hoje.'
    : eventosHoje
        .map(
          (e) => `
- ID: ${e.id}
  Nome: ${e.nome}
  Local: ${e.local}
  Data: ${formatDate(e.data)}
  Início: ${formatTime(e.starts_at)}
  Preço: ${formatPrice(e.ticket_price)}
  Status: ${e.status}
`,
        )
        .join('\n')
}

TODOS OS EVENTOS DISPONÍVEIS:
${eventos
  .map(
    (e) => `
- ID: ${e.id}
  Nome: ${e.nome}
  Local: ${e.local}
  Data: ${formatDate(e.data)}
  Início: ${formatTime(e.starts_at)}
  Preço: ${formatPrice(e.ticket_price)}
  Status: ${e.status}
`,
  )
  .join('\n')}

PERGUNTA DO USUÁRIO:
"${userMessage}"

Responda levando em conta SOMENTE as informações acima.
`;
}

export const sendMessageToAI = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Mensagem vazia.',
      });
    }
    const hoje = getHojeBrasilISO();

    const [hojeEventos] = await db.query(
      `
      SELECT id, nome, local, data, starts_at, ticket_price, status
      FROM events
      WHERE data = ?
      ORDER BY starts_at ASC
      `,
      [hoje],
    );

    const msgLower = message.toLowerCase();

    let eventosParaPrompt = [];

    const [match] = await db.query(
      `
      SELECT id, nome, local, data, starts_at, ticket_price, status
      FROM events
      WHERE LOWER(nome) LIKE ?
      ORDER BY data ASC, starts_at ASC
      `,
      [`%${msgLower}%`],
    );

    if (match.length > 0) {
      eventosParaPrompt = match;
    } else {
      const [lista] = await db.query(`
        SELECT id, nome, local, data, starts_at, ticket_price, status
        FROM events
        ORDER BY data ASC, starts_at ASC
      `);

      eventosParaPrompt = lista;
    }

    const prompt = buildPrompt(eventosParaPrompt, hojeEventos, message, hoje);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    });

    // 📌 JEITO CERTO DE PEGAR O TEXTO
    const reply =
      response.text ??
      response.candidates?.[0]?.content?.parts?.[0]?.text ??
      'Resposta vazia do modelo.';

    return res.json({
      success: true,
      reply,
    });
  } catch (err) {
    console.error('🔥 Erro no chatbot:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno no chatbot',
    });
  }
};
