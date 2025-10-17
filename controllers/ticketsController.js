import { v4 as uuidv4 } from "uuid";
import { generateQRCodeWithLogo } from "../services/qrService.js";
import db from "../config/mysql.js";

export const generateTicket = async (req, res) => {
  try {
    const { eventId, tipo, email } = req.body;

    if (!eventId || !tipo || !email) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    // 🔹 Gera código aleatório APAE-XXXXXX
    const code = `APAE-${uuidv4().split("-")[0].toUpperCase()}`;
    console.log(`🎟️ Gerando ticket com code: ${code}`);

    // 🔹 Gera QR Code com o código
    const qrUrl = await generateQRCodeWithLogo(code);
    console.log("✅ QR Code gerado:", qrUrl);

    // 🔹 Salva no banco
    await db.query(
      "INSERT INTO tickets (code, eventId, tipo, email, usado, qrUrl) VALUES (?, ?, ?, ?, ?, ?)",
      [code, eventId, tipo, email, false, qrUrl]
    );

    res.status(201).json({
      code,
      qrUrl,
      message: "Ticket gerado com sucesso!",
    });
  } catch (err) {
    console.error("❌ Erro ao gerar ticket:", err);
    res.status(500).json({ error: "Erro interno ao gerar ticket." });
  }
};
