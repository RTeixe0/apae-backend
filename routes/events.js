// routes/events.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authMiddleware');

router.post('/events', verifyToken, (req, res) => {
  // lógica de criação do evento
});

module.exports = router;
