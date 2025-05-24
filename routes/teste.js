const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authMiddleware');

router.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'Autenticação OK', user: req.user });
});

module.exports = router;
