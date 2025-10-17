import express from "express";
import { generateTicket } from "../controllers/ticketsController.js";

const router = express.Router();

router.post("/", generateTicket);

export default router;
