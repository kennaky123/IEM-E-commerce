import { Router } from 'express';
import { CouponController } from '../controllers/CouponController';

export function createCouponRouter(controller: CouponController): Router {
  const router = Router();

  router.get('/active', controller.listActive);
  router.post('/validate', controller.validate);

  return router;
}
