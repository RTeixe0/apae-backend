require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { admin, db, bucket } = require('./config/firebase');
const authMiddleware = require('./middlewares/authMiddleware');

const eventsRoutes = require('./routes/events');
const ticketsRoutes = require('./routes/tickets');
const validationRoutes = require('./routes/validation');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rota de teste
app.get('/', (req, res) => {
  res.send('API APAE rodando com sucesso!');
});
app.get('/ping', (req, res) => {
  res.send('API APAE está online 🎉');
});

// Rotas protegidas com middleware de autenticação
app.use('/events', authMiddleware, eventsRoutes);
app.use('/tickets', authMiddleware, ticketsRoutes);
app.use('/', authMiddleware, validationRoutes);


// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

