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
      // 1. Busca nome do evento
      const eventDoc = await db
        .collection("events")
        .doc(ticketData.eventId)
        .get();
      const eventName = eventDoc.exists
        ? eventDoc.data().nome
        : "Evento da APAE";

      // 2. Gera QR Code
      const qrUrl = await qrService.generateWithLogo(ticketId);

      // 3. Atualiza ticket com QR gerado
      await db.collection("tickets").doc(ticketId).update({
        qrUrl,
      });

      console.log("QR gerado e salvo com sucesso para:", ticketId);

      // 4. Envia e-mail com nome real do evento
      await emailService.sendTicketEmail(
        ticketData.email,
        qrUrl,
        ticketId,
        eventName
      );
    } catch (err) {
      console.error("Erro ao processar ticket:", err);
    }
  }
);
