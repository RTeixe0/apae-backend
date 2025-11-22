import { GoogleGenAI } from '@google/genai';
import db from '../config/mysql.js';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Formata data para "05 de dezembro de 2025"
function formatDate(dateString) {
  if (!dateString) return 'Não informado';

  const d = new Date(dateString + 'T00:00:00'); // evita timezone
  if (isNaN(d.getTime())) return 'Não informado';

  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// Formata hora para "09:00"
function formatTime(dateTimeString) {
  if (!dateTimeString) return 'Não informado';

  const d = new Date(dateTimeString);
  if (isNaN(d.getTime())) return 'Não informado';

  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');

  return `${hh}:${mm}`;
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

function buildPrompt(eventos, userMessage) {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
Você é o Assistente Virtual Oficial do aplicativo APAE Eventos.

REGRAS:
- Responda SOMENTE sobre os eventos cadastrados no sistema.
- Não invente nada. Se não houver resposta, diga:
  "Não encontrei essa informação no sistema."
- Utilize exatamente os dados fornecidos abaixo.
- Não fale sobre assuntos externos ao app.
- Considere que hoje é: ${hoje}

EVENTOS (dados reais do sistema):
${eventos
  .map(
    (e) => `
• **${e.nome}**
  • Data: ${formatDate(e.data)}
  • Início: ${formatTime(e.starts_at)}
  • Local: ${e.local}
  • Preço: ${formatPrice(e.ticket_price)}
  • Status: ${e.status}
`,
  )
  .join('\n')}

Pergunta do usuário:
"${userMessage}"
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

    const prompt = buildPrompt(eventosParaPrompt, message);

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
