import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

export function createAuthRouter(
  controller: AuthController,
  auth: AuthMiddleware
): Router {
  const router = Router();

  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/demo', controller.demo);
  router.post('/refresh', controller.refresh);
  router.post('/logout', auth.optionalAuth, controller.logout);
  router.get('/verify', auth.requireAuth, controller.verify);
  router.get('/google/config', controller.googleConfig);
  router.post('/google', controller.googleLogin);
  router.get('/google/callback', controller.googleCallback);
  router.get('/me', auth.requireAuth, controller.me);
  router.get('/users', auth.requireAuth, auth.requireAdmin, controller.listUsers);
  router.patch(
    '/users/:id/role',
    auth.requireAuth,
    auth.requireAdmin,
    controller.updateUserRole
  );

  return router;
}
