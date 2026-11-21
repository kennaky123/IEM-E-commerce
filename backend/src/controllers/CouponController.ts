import { Request, Response } from 'express';
import { IPricingService } from '../interfaces/services';
import { BaseController } from './BaseController';

export class CouponController extends BaseController {
  constructor(private readonly pricingService: IPricingService) {
    super();
  }

  listActive = this.handle(async (_req: Request, res: Response) => {
    const coupons = await this.pricingService.listActiveCoupons();
    res.json({ coupons });
  });

  validate = this.handle(async (req: Request, res: Response) => {
    const { subtotal, code } = req.body as {
      subtotal?: number;
      code?: string;
    };
    const result = await this.pricingService.validateCoupon(
      Number(subtotal) || 0,
      code || ''
    );
    res.json(result);
  });
}
