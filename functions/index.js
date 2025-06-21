const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

const qrService = require("./qrService");
const emailService = require("./emailService");

initializeApp();
const db = getFirestore();
const storage = getStorage();

exports.onTicketCreated = onDocumentCreated(
  {
    region: "southamerica-east1",
    document: "tickets/{ticketId}",
  },
  async (event) => {
    const ticketData = event.data?.data();
    const ticketId = event.params.ticketId;

    try {
      const qrUrl = await qrService.generateWithLogo(ticketId);

      await db.collection("tickets").doc(ticketId).update({
        qrUrl,
      });

      console.log("QR gerado e salvo com sucesso para:", ticketId);

      await emailService.sendTicketEmail(ticketData.email, qrUrl, ticketId);
    } catch (err) {
      console.error("Erro ao processar ticket:", err);
    }
  }
);
//update
