import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

export function createProductRouter(
  controller: ProductController,
  auth: AuthMiddleware
): Router {
  const router = Router();

  router.get('/', controller.list);
  router.get('/:id/pairings', controller.getPairings);
  router.get('/:id', controller.getById);
  router.post('/', auth.requireAuth, auth.requireAdmin, controller.create);
  router.put('/:id', auth.requireAuth, auth.requireAdmin, controller.update);
  router.delete('/:id', auth.requireAuth, auth.requireAdmin, controller.remove);

  return router;
}
