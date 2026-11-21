import { Router } from 'express';
import { ReviewController } from '../controllers/ReviewController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

export function createReviewRouter(
  controller: ReviewController,
  auth: AuthMiddleware
): Router {
  const router = Router();

  router.get('/product/:productId', controller.listByProduct);
  router.post('/product/:productId', auth.requireAuth, controller.create);
  router.put('/:id', auth.requireAuth, controller.update);
  router.delete('/:id', auth.requireAuth, controller.remove);
  router.post('/:id/replies', auth.requireAuth, controller.addReply);
  router.delete('/:id/replies/:replyId', auth.requireAuth, controller.removeReply);

  return router;
}
