import express from "express";
import { processPayment } from "../controllers/paymentController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create-payment", authenticate, processPayment);

export default router;
