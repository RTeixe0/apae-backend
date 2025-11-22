import { GoogleAIClient } from '@google-ai/generativelanguage';
import db from '../config/mysql.js';

const client = new GoogleAIClient({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Cria o prompt seguro que impede alucinação.
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

REGRAS IMPORTANTES:
- Responda SOMENTE sobre os eventos cadastrados.
- Tudo que você disser deve vir dos dados abaixo.
- Se a resposta não estiver nos dados, diga:
  "Não encontrei essa informação no sistema."
- Não fale sobre temas externos ao app.
- Considere que hoje é: ${hoje}

EVENTOS NO SISTEMA:
${JSON.stringify(eventos, null, 2)}

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
        message: 'Mensagem vazia.',
      });
    }

    const msgLower = message.toLowerCase();

    // 1) Busca evento específico
    const [match] = await db.query(
      `
      SELECT id, nome, local, data, starts_at, ends_at, ticket_price, status
      FROM events
      WHERE LOWER(nome) LIKE ?
      ORDER BY data ASC, starts_at ASC
    `,
      [`%${msgLower}%`],
    );

    let eventosParaPrompt = [];

    if (match.length > 0) {
      // Evento específico encontrado
      eventosParaPrompt = match;
    } else {
      // Nenhum match → manda lista básica
      const [lista] = await db.query(`
        SELECT id, nome, local, data, starts_at, status
        FROM events
        ORDER BY data ASC, starts_at ASC
      `);

      eventosParaPrompt = lista;
    }

    const prompt = buildPrompt(eventosParaPrompt, message);

    // 2) Chamada ao Gemini usando o SDK NOVO
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    });

    const reply = result.response.text();

    return res.json({ success: true, reply });
  } catch (err) {
    console.error('🔥 Erro no chatbot:', err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno no chatbot',
    });
  }
};
