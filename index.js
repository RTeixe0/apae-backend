import dotenv from "dotenv";
import express from "express";
import cors from "cors";

// 🔹 Middlewares e rotas
import { authenticate, authorize } from "./middlewares/authMiddleware.js";
import eventsRoutes from "./routes/events.js";
import ticketsRoutes from "./routes/tickets.js";
import validationRoutes from "./routes/validation.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 🔧 Middlewares globais
app.use(cors());
app.use(express.json());

// ✅ Rota pública (health check)
app.get("/", (req, res) => {
  res.send("🚀 API APAE rodando com sucesso na AWS!");
});

app.get("/ping", (req, res) => {
  res.send("🏓 API APAE está online e saudável!");
});

// ✅ Rotas protegidas (qualquer usuário autenticado)
app.use("/events", authenticate, eventsRoutes);
app.use("/tickets", authenticate, ticketsRoutes);
app.use("/validation", authenticate, validationRoutes);

// ✅ Exemplos de rotas com controle por grupo Cognito
app.get("/admin", authenticate, authorize(["admin"]), (req, res) => {
  res.json({
    message: `Bem-vindo administrador ${req.user.email}!`,
    grupos: req.user.groups,
  });
});

app.get("/staff", authenticate, authorize(["staff", "admin"]), (req, res) => {
  res.json({
    message: `Olá ${req.user.email}, acesso de staff liberado.`,
    grupos: req.user.groups,
  });
});

// ✅ Inicialização do servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🌎 Acesse: http://localhost:${PORT}/`);
});
