const express = require('express');
const router = express.Router();
const {
  createEvent,
  listEvents
} = require('../controllers/eventsController');

router.post('/', createEvent);
router.get('/', listEvents);

module.exports = router;
