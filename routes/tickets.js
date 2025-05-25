const express = require('express');
const router = express.Router();
const {
  generateTicket
} = require('../controllers/ticketsController');

router.post('/', generateTicket);

module.exports = router;
