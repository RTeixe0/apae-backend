import express from 'express';
import {
  getDashboardOverview,
  getEventsDashboard,
  getEventDetails,
} from '../controllers/dashboardController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * ============================================================
 *  📊 ROTAS DO DASHBOARD
 * ============================================================
 *
 *  GET /dashboard/overview          → visão geral do sistema
 *  GET /dashboard/events            → lista analítica de todos os eventos
 *  GET /dashboard/events/:eventId   → dashboard detalhado de um único evento
 *
 *  Todas protegidas por autenticação.
 */

// 🔹 Overview geral (eventos, tickets, receita, etc.)
router.get('/overview', authenticate, getDashboardOverview);

// 🔹 Dados analíticos de TODOS os eventos
router.get('/events', authenticate, getEventsDashboard);

// 🔹 Dashboard detalhado de um evento específico
router.get('/events/:eventId', authenticate, getEventDetails);

export default router;
