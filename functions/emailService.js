const nodemailer = require("nodemailer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Transporter do Nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "eventosapae4@gmail.com",
    pass: "znxa aghv ckuh wbai",
  },
});

/**
 * Envia o ingresso por e-mail com QR Code no corpo e em anexo
 * @param {string} to - e-mail do participante
 * @param {string} qrUrl - URL do QR Code
 * @param {string} code - código do ingresso
 * @param {string} eventName - nome do evento
 */
exports.sendTicketEmail = async (
  to,
  qrUrl,
  code,
  eventName = "Evento da APAE"
) => {
  try {
    // Baixa o QR Code temporariamente para anexar
    const response = await axios.get(qrUrl, { responseType: "arraybuffer" });
    const qrImage = Buffer.from(response.data, "binary");

    const mailOptions = {
      from: `"APAE Eventos" <eventosapae4@gmail.com>`,
      to,
      subject: `🎫 Seu ingresso para ${eventName}`,
      html: `
        <h2>Olá!</h2>
        <p>Você está confirmado para o <strong>${eventName}</strong>!</p>
        <p>Apresente o QR Code abaixo na entrada do evento:</p>
        <img src="cid:qrcode" style="width:200px;" alt="QR Code" />
        <p><strong>Código do ingresso:</strong> ${code}</p>
        <p>Nos vemos lá! 💙</p>
      `,
      attachments: [
        {
          filename: "qrcode.png",
          content: qrImage,
          cid: "qrcode", // usado no <img src="cid:qrcode">
        },
        {
          filename: `Ingresso-${eventName.replace(/\s+/g, "_")}-${code}.png`,
          content: qrImage,
        },
      ],
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("E-mail enviado com sucesso:", result.messageId);
  } catch (err) {
    console.error("Erro ao enviar e-mail:", err);
    throw err;
  }
};
