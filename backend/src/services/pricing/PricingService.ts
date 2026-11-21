import { AppConfig } from '../../config/AppConfig';
import { BadRequestError } from '../../errors/AppError';
import { ICouponRepository } from '../../interfaces/repositories';
import { IDiscountStrategy, IPricingService } from '../../interfaces/services';
import { Coupon, DiscountType, PriceQuote } from '../../types';

export class PricingService implements IPricingService {
  private readonly strategyMap: Map<DiscountType, IDiscountStrategy>;

  constructor(
    private readonly couponRepo: ICouponRepository,
    strategies: IDiscountStrategy[],
    private readonly config: AppConfig
  ) {
    this.strategyMap = new Map(strategies.map((s) => [s.type, s]));
  }

  async listActiveCoupons(): Promise<Coupon[]> {
    return this.couponRepo.findAllActive();
  }

  async validateCoupon(
    subtotal: number,
    couponCode: string
  ): Promise<{ coupon: Coupon; discount: number }> {
    const normalized = couponCode.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestError('Coupon code is required.');
    }

    const coupon = await this.couponRepo.findActiveByCode(normalized);
    if (!coupon) {
      throw new BadRequestError(`Coupon code "${normalized}" is invalid or expired.`);
    }

    if (subtotal < coupon.minSubtotal) {
      throw new BadRequestError(
        `Coupon ${coupon.code} requires minimum subtotal of ${coupon.minSubtotal.toLocaleString('vi-VN')}₫.`
      );
    }

    const strategy = this.strategyMap.get(coupon.type);
    const discount = strategy ? strategy.calculate(subtotal, coupon) : 0;
    return { coupon, discount };
  }

  async calculateQuote(subtotal: number, couponCode?: string): Promise<PriceQuote> {
    let discount = 0;
    let normalizedCode: string | undefined;

    if (couponCode && couponCode.trim()) {
      const coupon = await this.couponRepo.findActiveByCode(couponCode);
      if (coupon && subtotal >= coupon.minSubtotal) {
        const strategy = this.strategyMap.get(coupon.type);
        if (strategy) {
          discount = strategy.calculate(subtotal, coupon);
          normalizedCode = coupon.code;
        }
      }
    }

    const shippingFee =
      subtotal === 0 || subtotal >= this.config.freeShippingThreshold
        ? 0
        : this.config.standardShippingFee;
    const total = Math.max(0, subtotal - discount + shippingFee);

    return {
      subtotal,
      discount,
      couponCode: normalizedCode,
      shippingFee,
      total,
      freeShippingThreshold: this.config.freeShippingThreshold,
    };
  }
}
