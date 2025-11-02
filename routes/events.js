import express from "express";
import {
  createEvent,
  listEvents,
  updateEvent,
  deleteEvent,
} from "../controllers/eventsController.js";

const router = express.Router();

// 🔹 Todos autenticados podem ver
router.get("/", listEvents);

// 🔹 Staff e Admin podem criar
router.post("/", createEvent);

// 🔹 Admin pode editar e deletar
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);

export default router;
