import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

export function createPaymentRouter(
  controller: PaymentController,
  auth: AuthMiddleware
): Router {
  const router = Router();

  router.post('/vnpay/create-url', auth.optionalAuth, controller.createVnpayUrl);
  router.get('/vnpay/verify', controller.verifyVnpayReturn);
  router.get('/vnpay/return', controller.vnpayReturnRedirect);
  router.get('/vnpay/ipn', controller.vnpayIpn);
  router.post(
    '/vnpay/sandbox-complete',
    auth.optionalAuth,
    controller.completeSandboxPayment
  );

  return router;
}
