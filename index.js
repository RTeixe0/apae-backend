// index.js
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

// 🔹 Middlewares e rotas
import { authenticate, authorize } from './middlewares/authMiddleware.js';
import eventsRoutes from './routes/events.js';
import ticketsRoutes from './routes/tickets.js';
import validationRoutes from './routes/validation.js';
import paymentRoutes from './routes/payment.js';
import dashboardRoutes from './routes/dashboard.js'; // << NOVO

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 🔧 Middlewares globais
app.use(cors());
app.use(express.json());

// ✅ Health checks
app.get('/', (_, res) => res.send('🚀 API APAE rodando com sucesso na AWS!'));
app.get('/ping', (_, res) => res.send('🏓 API APAE está online e saudável!'));

// =======================================================
// 🔥 ROTAS PRINCIPAIS (todas protegidas por autenticação)
// =======================================================
app.use('/events', authenticate, eventsRoutes);
app.use('/tickets', authenticate, ticketsRoutes);
app.use('/validation', authenticate, validationRoutes);
app.use('/payment', authenticate, paymentRoutes);

// =======================================================
// 📊 DASHBOARD – também protegido por autenticação
// =======================================================
app.use('/dashboard', authenticate, dashboardRoutes);

// =======================================================
// 🔐 Exemplo de rotas protegidas por função/grupo
// =======================================================
app.get('/admin', authenticate, authorize(['admin']), (req, res) => {
  res.json({
    message: `Bem-vindo administrador ${req.user.email}!`,
    grupos: req.user.groups,
    role: req.user.role,
  });
});

app.get('/staff', authenticate, authorize(['staff', 'admin']), (req, res) => {
  res.json({
    message: `Olá ${req.user.email}, acesso de staff liberado.`,
    grupos: req.user.groups,
    role: req.user.role,
  });
});

// =======================================================
// ❌ Fallback para rotas inexistentes
// =======================================================
app.use((_, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// =======================================================
// 🚀 Inicialização do servidor
// =======================================================
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
