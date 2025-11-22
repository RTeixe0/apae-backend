import { GoogleGenAI } from "@google/genai";
import db from "../config/mysql.js";

// O client lê automaticamente a variável GEMINI_API_KEY do ambiente
const ai = new GoogleGenAI({});

/**
 * Cria o prompt seguro que impede alucinações.
 */
function buildPrompt(eventos, userMessage) {
  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
Você é o Assistente Virtual Oficial do aplicativo APAE Eventos.

REGRAS IMPORTANTES:
- Responda SOMENTE sobre os eventos cadastrados.
- Nunca invente dados.
- Use exclusivamente as informações fornecidas nos eventos abaixo.
- Se não houver resposta possível, diga:
  "Não encontrei essa informação no sistema."
- Não fale de temas externos ao app.
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

    if (!message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Mensagem vazia.",
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
      [`%${msgLower}%`]
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

    const prompt = buildPrompt(eventosParaPrompt, message);

    // 2) Chamada ao Gemini com SDK atualizado
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash", // ou "gemini-2.5-flash"
      contents: prompt,
    });

    return res.json({
      success: true,
      reply: response.text,
    });

  } catch (err) {
    console.error("🔥 Erro no chatbot:", err);
    return res.status(500).json({
      success: false,
      message: "Erro interno no chatbot",
    });
  }
};
