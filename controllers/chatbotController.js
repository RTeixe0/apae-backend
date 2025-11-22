import { GoogleGenAI } from '@google/genai';
import db from '../config/mysql.js';

// Cliente da API Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Monta o prompt seguro, sem alucinação.
 */
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
- Não invente nada. Se não houver resposta nos dados, diga:
  "Não encontrei essa informação no sistema."
- Não fale sobre política, esportes, cultura pop, vida pessoal, nada externo ao app.
- Hoje é: ${hoje}

EVENTOS NO SISTEMA:
${JSON.stringify(eventos, null, 2)}

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

    // 1) Busca evento com match no nome
    const [match] = await db.query(
      `
      SELECT id, nome, local, data, starts_at, ticket_price, status
      FROM events
      WHERE LOWER(nome) LIKE ?
      ORDER BY data ASC, starts_at ASC
    `,
      [`%${msgLower}%`],
    );

    let eventosParaPrompt = [];

    if (match.length > 0) {
      eventosParaPrompt = match;
    } else {
      // Caso não encontre, lista eventos
      const [lista] = await db.query(`
        SELECT id, nome, local, data, starts_at, status
        FROM events
        ORDER BY data ASC, starts_at ASC
      `);

      eventosParaPrompt = lista;
    }

    const prompt = buildPrompt(eventosParaPrompt, message);

    // 2) Modelo gemini-2.5-flash (estável)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    });

    const reply = response.text();

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
