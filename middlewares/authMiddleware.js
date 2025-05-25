const { admin } = require('../config/firebase');

// Middleware para verificar o token JWT do Firebase
module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // injeta os dados do usuário na requisição
    next();
  } catch (err) {
    console.error('Token inválido:', err);
    res.status(401).json({ error: 'Token inválido' });
  }
};
