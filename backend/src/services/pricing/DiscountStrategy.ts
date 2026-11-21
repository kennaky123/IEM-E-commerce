import { IDiscountStrategy } from '../../interfaces/services';
import { Coupon, DiscountType } from '../../types';

export class PercentageDiscountStrategy implements IDiscountStrategy {
  readonly type: DiscountType = 'PERCENTAGE';

  calculate(subtotal: number, coupon: Coupon): number {
    if (subtotal <= 0 || coupon.value <= 0) return 0;
    return Math.min(subtotal, Math.round((subtotal * coupon.value) / 100));
  }
}

export class FixedAmountDiscountStrategy implements IDiscountStrategy {
  readonly type: DiscountType = 'FIXED';

  calculate(subtotal: number, coupon: Coupon): number {
    if (subtotal <= 0 || coupon.value <= 0) return 0;
    return Math.min(subtotal, Math.round(coupon.value));
  }
}
