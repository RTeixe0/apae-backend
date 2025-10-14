import express from "express";
import { generateTicket } from "../controllers/ticketsController.js";

const router = express.Router();

// 🔹 Gerar ticket
router.post("/", generateTicket);

export default router;
