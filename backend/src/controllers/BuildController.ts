import { Request, Response } from 'express';
import { BuildService } from '../services/BuildService';
import { ComponentCategory, Product } from '../types';
import { BaseController } from './BaseController';

export class BuildController extends BaseController {
  constructor(private readonly buildService: BuildService) {
    super();
  }

  validate = this.handle(async (req: Request, res: Response) => {
    const { slots } = req.body as {
      slots?: Partial<Record<ComponentCategory, string | Product | null>>;
    };
    const result = await this.buildService.validateSlots(slots!);
    res.json(result);
  });

  evaluateCandidates = this.handle(async (req: Request, res: Response) => {
    const { category, slots, search, strictOnly } = req.body as {
      category: ComponentCategory;
      slots?: Partial<Record<ComponentCategory, string | Product | null>>;
      search?: string;
      strictOnly?: boolean;
    };
    const candidates = await this.buildService.evaluateCandidates({
      category,
      slots,
      search,
      strictOnly,
    });
    res.json({ candidates, total: candidates.length });
  });

  presets = this.handle(async (_req: Request, res: Response) => {
    const presets = await this.buildService.getPopulatedPresets();
    res.json({ presets });
  });
}
