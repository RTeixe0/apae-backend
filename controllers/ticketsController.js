import { generateQRCodeWithLogo } from "../services/qrService.js";
import db from "../config/mysql.js";
// import { sendTicketEmail } from "../config/emailService.js"; // habilitaremos depois

// POST /tickets
export const generateTicket = async (req, res) => {
  try {
    const { eventId, tipo, email } = req.body;

    if (!eventId || !tipo || !email) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    // 🔹 1. Gerar um ID único para o ticket
    const [result] = await db.query(
      "INSERT INTO tickets (eventId, tipo, email, usado) VALUES (?, ?, ?, ?)",
      [eventId, tipo, email, false]
    );
    const code = result.insertId.toString();

    console.log(`🎟️ Ticket criado: ID ${code}`);

    // 🔹 2. Gerar o QR Code e salvar no S3
    const qrUrl = await generateQRCodeWithLogo(code);

    console.log("✅ QR Code gerado e salvo:", qrUrl);

    // 🔹 3. Atualizar o ticket com a URL do QR
    await db.query("UPDATE tickets SET qrUrl = ? WHERE id = ?", [qrUrl, code]);

    // 🔹 4. (opcional) Enviar o QR por e-mail via SES
    // await sendTicketEmail(email, qrUrl, code);

    res.status(201).json({
      id: code,
      qrUrl,
      message: "Ticket gerado com sucesso.",
    });
  } catch (err) {
    console.error("❌ Erro ao gerar ticket:", err);
    res.status(500).json({ error: "Erro interno ao gerar ticket." });
  }
};
