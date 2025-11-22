import pkg from '@google-ai/generativelanguage';
import db from '../config/mysql.js';

const { GoogleAIClient } = pkg;

const client = new GoogleAIClient({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Prompt seguro e limitado aos eventos.
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
- Responda APENAS sobre eventos cadastrados no sistema.
- Use somente os dados enviados abaixo.
- Nunca invente datas, nomes ou qualquer informação.
- Se não souber, diga: "Não encontrei essa informação no sistema."
- Não fale sobre nada fora do aplicativo.
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

    // 1) Buscar evento específico
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
      const [lista] = await db.query(`
        SELECT id, nome, local, data, starts_at, status
        FROM events
        ORDER BY data ASC, starts_at ASC
      `);

      eventosParaPrompt = lista;
    }

    // Gerar prompt final
    const prompt = buildPrompt(eventosParaPrompt, message);

    // 2) Criar instância do modelo (SDK novo)
    const model = client.getGenerativeModel({
      model: 'models/gemini-1.5-flash',
    });

    // 3) Enviar prompt
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
