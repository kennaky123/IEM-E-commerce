import { Router } from 'express';
import { StatsController } from '../controllers/StatsController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

export function createStatsRouter(
  controller: StatsController,
  auth: AuthMiddleware
): Router {
  const router = Router();

  router.get('/dashboard', auth.requireAuth, auth.requireAdmin, controller.dashboard);

  return router;
}
