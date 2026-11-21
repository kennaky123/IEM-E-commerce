import { Response } from 'express';
import { AuthRequest } from '../middleware/AuthMiddleware';
import { StatsService } from '../services/StatsService';
import { BaseController } from './BaseController';

export class StatsController extends BaseController {
  constructor(private readonly statsService: StatsService) {
    super();
  }

  dashboard = this.handle<AuthRequest>(async (_req, res: Response) => {
    const stats = await this.statsService.getDashboardStats();
    res.json({ stats });
  });
}
