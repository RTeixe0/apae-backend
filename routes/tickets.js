import express from "express";
import {
  generateTicket,
  listUserTickets,
} from "../controllers/ticketsController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 🔹 Cria ticket (usuário compra)
router.post("/", authenticate, generateTicket);

// 🔹 Lista tickets do usuário logado
router.get("/", authenticate, listUserTickets);

export default router;
