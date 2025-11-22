import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '../config/mysql.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Resumir textos grandes para gastar menos tokens
 */
function resumir(text, max = 180) {
  if (!text) return '';
  text = String(text);
  return text.length > max ? text.slice(0, max) + '...' : text;
}

/**
 * Prompt enxuto, porém extremamente rígido e seguro.
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

REGRAS IMPORTANTES:
- Responda somente sobre assuntos do aplicativo APAE Eventos.
- Utilize exclusivamente os dados fornecidos nos EVENTOS abaixo.
- Proibido inventar datas, nomes, descrições ou locais.
- Se a resposta não estiver nos dados, diga:
  "Não encontrei essa informação no sistema."
- Não fale sobre qualquer outro tema (política, ciência, tecnologia, cultura pop, etc.)
- Sempre considere que HOJE é: ${hoje}
- Responda de forma curta, clara e educada.

EVENTOS (dados oficiais do sistema):
${JSON.stringify(eventos)}

Pergunta do usuário: """${userMessage}"""
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

    // 🧠 1. Tenta achar evento exato por palavra-chave
    const [match] = await db.query(
      `
      SELECT id, nome, descricao, local, starts_at, ends_at
      FROM events
      WHERE LOWER(nome) LIKE ?
      ORDER BY starts_at ASC
    `,
      [`%${msgLower}%`],
    );

    let eventosParaPrompt;

    if (match.length > 0) {
      // 🎯 Evento relevante encontrado → manda só esse
      eventosParaPrompt = match.map((ev) => ({
        ...ev,
        descricao: resumir(ev.descricao),
      }));
    } else {
      // 📉 Nenhum match → manda só uma lista curta e leve
      const [lista] = await db.query(`
        SELECT id, nome, local, starts_at
        FROM events
        ORDER BY starts_at ASC;
      `);

      eventosParaPrompt = lista.map((ev) => ({
        id: ev.id,
        nome: ev.nome,
        local: ev.local,
        starts_at: ev.starts_at,
      }));
    }

    // 🧩 2. Criar prompt econômico
    const prompt = buildPrompt(eventosParaPrompt, message);

    // 🤖 3. Chamar Gemini (Flash = mais rápido & barato)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
