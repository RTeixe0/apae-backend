const { db } = require('../config/firebase');

// GET /validate/:code
exports.validateTicket = async (req, res) => {
  try {
    const code = req.params.code;
    const doc = await db.collection('tickets').doc(code).get();

    if (!doc.exists) {
      return res.status(404).json({ valid: false, message: 'Ingresso não encontrado' });
    }

    const data = doc.data();
    if (data.usado) {
      return res.status(200).json({ valid: false, message: 'Ingresso já utilizado' });
    }

    res.status(200).json({ valid: true, ticket: data });
  } catch (err) {
    console.error('Erro ao validar ingresso:', err);
    res.status(500).json({ error: 'Erro ao validar ingresso' });
  }
};

// POST /scan/:code
exports.scanTicket = async (req, res) => {
  try {
    const code = req.params.code;
    const scannerId = req.user.uid;

    const ticketRef = db.collection('tickets').doc(code);
    const doc = await ticketRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Ingresso não encontrado' });
    }

    const ticketData = doc.data();
    if (ticketData.usado) {
      return res.status(200).json({ success: false, message: 'Ingresso já foi utilizado' });
    }

    // Atualiza o ingresso como usado
    await ticketRef.update({ usado: true });

    // Registra o log de uso
    await db.collection('logs').add({
      ticketId: code,
      scannerId,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({ success: true, message: 'Ingresso registrado com sucesso' });
  } catch (err) {
    console.error('Erro ao registrar uso:', err);
    res.status(500).json({ error: 'Erro ao registrar uso' });
  }
};

// GET /report/:eventId
exports.getEventReport = async (req, res) => {
  try {
    const eventId = req.params.eventId;

    const snapshot = await db.collection('tickets')
      .where('eventId', '==', eventId)
      .get();

    let total = 0;
    let usados = 0;

    snapshot.forEach(doc => {
      total++;
      if (doc.data().usado) usados++;
    });

    res.status(200).json({ eventId, total, usados });
  } catch (err) {
    console.error('Erro ao gerar relatório:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
};
