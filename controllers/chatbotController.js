import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '../config/mysql.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Prompt enxuto, seguro e sem alucinação.
 */
function buildPrompt(eventos, userMessage) {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
Você é o Assistente Virtual Oficial da APAE Eventos.

REGRAS:
- Responda apenas sobre eventos cadastrados no sistema.
- Utilize EXCLUSIVAMENTE os dados abaixo.
- Proibido inventar informações.
- Se não souber, responda: "Não encontrei essa informação no sistema."
- Nunca fale sobre temas fora do app (política, cultura pop, esportes, etc.).
- Hoje é: ${hoje}

EVENTOS DISPONÍVEIS:
${JSON.stringify(eventos)}

Pergunta do usuário:
"${userMessage}"
  `;
}

export const sendMessageToAI = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Mensagem vazia',
      });
    }

    const msgLower = message.toLowerCase();

    // 🧠 1. Tenta achar evento por nome
    const [match] = await db.query(
      `
      SELECT id, nome, local, data, starts_at, ticket_price, status
      FROM events
      WHERE LOWER(nome) LIKE ?
      ORDER BY data ASC, starts_at ASC
      `,
      [`%${msgLower}%`],
    );

    let eventosParaPrompt;

    if (match.length > 0) {
      // 🎯 Evento encontrado
      eventosParaPrompt = match.map((ev) => ({
        id: ev.id,
        nome: ev.nome,
        local: ev.local,
        data: ev.data,
        starts_at: ev.starts_at,
        ticket_price: ev.ticket_price,
        status: ev.status,
      }));
    } else {
      // 📉 Nenhum match → lista resumida
      const [lista] = await db.query(`
        SELECT id, nome, local, data, starts_at, status
        FROM events
        ORDER BY data ASC, starts_at ASC
      `);

      eventosParaPrompt = lista.map((ev) => ({
        id: ev.id,
        nome: ev.nome,
        local: ev.local,
        data: ev.data,
        starts_at: ev.starts_at,
        status: ev.status,
      }));
    }

    // 🧩 2. Prompt final
    const prompt = buildPrompt(eventosParaPrompt, message);

    // 🤖 3. Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    return res.json({ success: true, reply });
  } catch (err) {
    console.error('Erro no chatbot:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno no chatbot',
    });
  }
};
