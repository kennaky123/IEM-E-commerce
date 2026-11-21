import { Router } from 'express';
import { BuildController } from '../controllers/BuildController';

export function createBuildRouter(controller: BuildController): Router {
  const router = Router();

  router.post('/validate', controller.validate);
  router.post('/candidates', controller.evaluateCandidates);
  router.get('/presets', controller.presets);

  return router;
}
