//FALTA CONFIGURAR


require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.sendTicketEmail = async (to, qrUrl, code) => {
  const mailOptions = {
    from: `"APAE Eventos" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Seu ingresso APAE',
    html: `
      <p>Olá,</p>
      <p>Segue seu ingresso:</p>
      <img src="${qrUrl}" alt="QR Code" />
      <p>Código: <strong>${code}</strong></p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

//module.exports = transporter;
