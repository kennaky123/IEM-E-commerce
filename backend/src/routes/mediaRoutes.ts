import { Router } from 'express';
import { MediaController } from '../controllers/MediaController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

export function createMediaRouter(
  controller: MediaController,
  auth: AuthMiddleware
): Router {
  const router = Router();

  router.get('/tainghe', controller.listTainghe);
  router.get('/studio-songlong', controller.listStudioSonglong);
  router.post('/upload', auth.requireAuth, auth.requireAdmin, controller.upload);

  return router;
}
