const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
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
    from: `"APAE Eventos" <${process.env.SMTP_USER}>`,
    to,
    subject: "Seu ingresso para o evento da APAE",
    html: `
      <h2>Olá!</h2>
      <p>Seu ingresso foi gerado com sucesso. Apresente o QR Code abaixo no evento:</p>
      <img src="${qrUrl}" alt="QR Code" style="width:200px;" />
      <p><strong>Código do ingresso:</strong> ${code}</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};
