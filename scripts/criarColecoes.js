const db = require('../config/firebase');

async function criarDocumentosExemplo() {
  // Users
  const userRef = db.collection('users').doc();
  await userRef.set({
    uid: userRef.id,
    nome: 'Admin Teste',
    email: 'admin@apae.com',
    role: 'admin'
  });

  // Events
  const eventRef = db.collection('events').doc();
  await eventRef.set({
    id: eventRef.id,
    nome: 'Festa Junina',
    local: 'APAE Itapira',
    data: '2025-06-15',
    bannerUrl: '',
    organizadorId: userRef.id
  });

  // Tickets
  const ticketRef = db.collection('tickets').doc();
  await ticketRef.set({
    id: ticketRef.id,
    eventId: eventRef.id,
    tipo: 'VIP',
    email: 'convidado@apae.com',
    usado: false,
    qrUrl: ''
  });

  // Logs
  const logRef = db.collection('logs').doc();
  await logRef.set({
    ticketId: ticketRef.id,
    scannerId: 'atendente123',
    timestamp: new Date().toISOString()
  });

  console.log('Coleções e documentos criados!');
}

criarDocumentosExemplo();
