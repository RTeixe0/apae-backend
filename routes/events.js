import express from "express";
import multer from "multer"; // ← novo
import {
  createEvent,
  listEvents,
  updateEvent,
  deleteEvent,
} from "../controllers/eventsController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { uploadBanner } from "../services/bannerService.js"; // ← novo

const router = express.Router();

// Configura multer em memória (sem salvar no disco)
const upload = multer(); // ← novo

// 🔹 Todos autenticados podem listar eventos
router.get("/", authenticate, listEvents);

// 🔹 Staff e Admin podem criar eventos
router.post("/", authenticate, createEvent);

// 🔹 Admin pode editar e deletar
router.put("/:id", authenticate, updateEvent);
router.delete("/:id", authenticate, deleteEvent);

// 🔥 Novo endpoint: upload de banner (S3)
router.post(
  "/upload-banner",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Nenhuma imagem enviada no campo 'file'." });
      }

      // Envia arquivo ao S3
      const url = await uploadBanner(req.file.buffer, req.file.mimetype);

      // Responde com URL pública
      return res.json({ url });
    } catch (err) {
      console.error("Erro no upload do banner:", err);
      return res.status(500).json({ error: "Falha ao enviar banner." });
    }
  }
);

export default router;
