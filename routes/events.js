import express from "express";
import {
  createEvent,
  listEvents,
  updateEvent,
  deleteEvent,
} from "../controllers/eventsController.js";
import { authenticate } from "../middlewares/authMiddleware.js"; // 🔒 se já estiver configurado Cognito

const router = express.Router();

// 🔹 Todos autenticados podem listar eventos
router.get("/", authenticate, listEvents);

// 🔹 Staff e Admin podem criar
router.post("/", authenticate, createEvent);

// 🔹 Admin pode editar e deletar
router.put("/:id", authenticate, updateEvent);
router.delete("/:id", authenticate, deleteEvent);

export default router;
