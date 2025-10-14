require("dotenv").config();
const express = require("express");
const cors = require("cors");

// 🔹 Middlewares e rotas
const authMiddleware = require("./middlewares/authMiddleware");
const eventsRoutes = require("./routes/events");
const ticketsRoutes = require("./routes/tickets");
const validationRoutes = require("./routes/validation");

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
