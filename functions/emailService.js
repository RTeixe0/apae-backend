const nodemailer = require("nodemailer");

// Transporter configurado para Firebase Functions (sem .env)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // usar true apenas com porta 465
  auth: {
    user: "eventosapae4@gmail.com",
    pass: "znxa aghv ckuh wbai", // App password gerado no Gmail
  },
});

/**
 * Envia o ingresso com QR Code por e-mail
 * @param {string} to - e-mail do participante
 * @param {string} qrUrl - URL do QR Code
 * @param {string} code - código do ingresso
 */
exports.sendTicketEmail = async (to, qrUrl, code) => {
  const mailOptions = {
    from: `"APAE Eventos" <eventosapae4@gmail.com>`,
    to,
    subject: "Seu ingresso para o evento da APAE",
    html: `
      <h2>Olá!</h2>
      <p>Seu ingresso foi gerado com sucesso. Apresente o QR Code abaixo no evento:</p>
      <img src="${qrUrl}" alt="QR Code" style="width:200px;" />
      <p><strong>Código do ingresso:</strong> ${code}</p>
    `,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log("Email enviado com sucesso:", result.messageId);
  } catch (err) {
    console.error("Erro ao enviar e-mail:", err);
    throw err;
  }
};
