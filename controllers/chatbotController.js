import { GoogleGenAI } from '@google/genai';
import db from '../config/mysql.js';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

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
- Não fale sobre temas externos ao aplicativo.
- Hoje é: ${hoje}

EVENTOS:
${eventos
  .map(
    (e) => `
- ID: ${e.id}
  Nome: ${e.nome}
  Local: ${e.local}
  Data: ${e.data}
  Início: ${e.starts_at || 'Não informado'}
  Preço: R$ ${e.ticket_price?.toFixed(2) ?? '0.00'}
  Status: ${e.status}
`,
  )
  .join('\n')}


Pergunta:
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
