const { db } = require('../config/firebase');

// POST /events
exports.createEvent = async (req, res) => {
  try {
    const { nome, local, data, capacidade, bannerUrl } = req.body;
    const userId = req.user.uid; // vindo do middleware de autenticação

    const ref = await db.collection('events').add({
      nome,
      local,
      data,
      capacidade,
      bannerUrl,
      organizadorId: userId,
    });

    res.status(201).json({ id: ref.id });
  } catch (err) {
    console.error('Erro ao criar evento:', err);
    res.status(500).json({ error: 'Erro ao criar evento' });
  }
};

// GET /events
exports.listEvents = async (req, res) => {
  try {
    const userId = req.user.uid;

    const snapshot = await db
      .collection('events')
      .where('organizadorId', '==', userId)
      .get();

    const eventos = [];
    snapshot.forEach(doc => {
      eventos.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(eventos);
  } catch (err) {
    console.error('Erro ao listar eventos:', err);
    res.status(500).json({ error: 'Erro ao listar eventos' });
  }
};
