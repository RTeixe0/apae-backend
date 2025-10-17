import dotenv from "dotenv";
import express from "express";
import cors from "cors";

// 🔹 Middlewares e rotas
import authMiddleware from "./middlewares/authMiddleware.js";
import eventsRoutes from "./routes/events.js";
import ticketsRoutes from "./routes/tickets.js";
import validationRoutes from "./routes/validation.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 🔧 Middleware base
app.use(cors());
app.use(express.json());

// ✅ Rota pública de status
app.get("/", (req, res) => {
  res.send("🚀 API APAE rodando com sucesso na AWS!");
});

app.get("/ping", (req, res) => {
  res.send("🏓 API APAE está online e saudável!");
});

// ✅ Rotas protegidas (exigem autenticação Cognito)
app.use("/events", authMiddleware, eventsRoutes);
app.use("/tickets", authMiddleware, ticketsRoutes);
app.use("/", authMiddleware, validationRoutes);

// ✅ Inicializar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
