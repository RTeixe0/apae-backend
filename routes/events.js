import express from "express";
import { createEvent, listEvents } from "../controllers/eventsController.js";

const router = express.Router();

// 🔹 Criar novo evento
router.post("/", createEvent);

// 🔹 Listar eventos
router.get("/", listEvents);

export default router;
