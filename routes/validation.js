import express from "express";
import {
  validateTicket,
  scanTicket,
  getEventReport,
} from "../controllers/validationController.js";

const router = express.Router();

// 🔹 Valida o ingresso
router.get("/validate/:code", validateTicket);

// 🔹 Marca ingresso como usado
router.post("/scan/:code", scanTicket);

// 🔹 Relatório do evento
router.get("/report/:eventId", getEventReport);

export default router;
