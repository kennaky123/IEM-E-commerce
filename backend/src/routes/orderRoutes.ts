import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

export function createOrderRouter(
  controller: OrderController,
  auth: AuthMiddleware
): Router {
  const router = Router();

  router.post('/quote', controller.previewQuote);
  router.get('/my', auth.requireAuth, controller.getMyOrders);
  router.post('/', auth.optionalAuth, controller.placeOrder);
  router.get('/', auth.requireAuth, auth.requireAdmin, controller.listAll);
  router.patch(
    '/:id/status',
    auth.requireAuth,
    auth.requireAdmin,
    controller.updateStatus
  );
  router.delete('/:id', auth.requireAuth, auth.requireAdmin, controller.remove);

  return router;
}
