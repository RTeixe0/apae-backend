const { db } = require("../config/firebase");
// const qrService = require('../services/qrService');
// const emailService = require('../services/emailService');

// POST /tickets
exports.generateTicket = async (req, res) => {
  try {
    const { eventId, tipo, email } = req.body;

    // Cria novo ticket no Firestore
    const newTicketRef = db.collection("tickets").doc();
    const code = newTicketRef.id;

    // const qrUrl = await qrService.generate(code);

    await newTicketRef.set({
      eventId,
      tipo,
      email,
      usado: false,
      qrUrl,
    });

    // Envia por email
    await emailService.sendTicketEmail(email, qrUrl, code);

    res.status(201).json({ id: code, qrUrl });
  } catch (err) {
    console.error("Erro ao gerar ticket:", err);
    res.status(500).json({ error: "Erro ao gerar ticket" });
  }
};
