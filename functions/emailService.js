const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { generateWithLogo } = require("./qrService");
const { sendTicketEmail } = require("./emailService");

admin.initializeApp();

exports.onTicketCreated = functions
  .region("southamerica-east1")
  .firestore.document("tickets/{ticketId}")
  .onCreate(async (snap, context) => {
    try {
      const ticket = snap.data();
      const code = context.params.ticketId;
      const qrUrl = await generateWithLogo(code);
      await admin.firestore().collection("tickets").doc(code).update({ qrUrl });

      if (ticket.email) {
        await sendTicketEmail(ticket.email, qrUrl, code);
      }

      console.log("QR gerado e salvo com sucesso para:", code);
    } catch (err) {
      console.error("Erro ao processar ticket:", err);
      throw err;
    }
  });
