import express from "express";
import {
  validateTicket,
  scanTicket,
  getEventReport,
} from "../controllers/validationController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 🔹 Verifica validade do ingresso (sem registrar uso)
router.get("/validate/:code", authenticate, validateTicket);

// 🔹 Marca ingresso como usado (staff/admin)
router.post("/scan/:code", authenticate, scanTicket);

// 🔹 Relatório de evento (somente staff/admin)
router.get("/report/:eventId", authenticate, getEventReport);

export default router;
