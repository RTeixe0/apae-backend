const express = require('express');
const router = express.Router();
const {
  validateTicket,
  scanTicket,
  getEventReport
} = require('../controllers/validationController');

// GET /validate/:code - Valida o ingresso
router.get('/validate/:code', validateTicket);

// POST /scan/:code - Marca como usado
router.post('/scan/:code', scanTicket);

// GET /report/:eventId - Relatório do evento
router.get('/report/:eventId', getEventReport);

module.exports = router;
