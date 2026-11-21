import { ICouponRepository } from '../interfaces/repositories';
import { CouponModel } from '../models/Coupon';
import { Coupon } from '../types';
import { BaseMongoRepository } from './BaseMongoRepository';

const INITIAL_COUPONS: Coupon[] = [
  {
    code: 'MOONDROP10',
    type: 'PERCENTAGE',
    value: 10,
    minSubtotal: 0,
    description: 'Giảm 10% tổng giá trị đơn hàng âm thanh Hi-Fi',
    active: true,
  },
  {
    code: 'VDSF500K',
    type: 'FIXED',
    value: 500000,
    minSubtotal: 10000000,
    description: 'Giảm 500.000₫ cho đơn từ 10.000.000₫',
    active: true,
  },
];

export class MongoCouponRepository
  extends BaseMongoRepository<Coupon>
  implements ICouponRepository
{
  private isNotExpired(coupon: Coupon): boolean {
    if (!coupon.expiresAt) return true;
    const expiryTime = Date.parse(coupon.expiresAt);
    return Number.isNaN(expiryTime) || expiryTime > Date.now();
  }

  async findActiveByCode(code: string): Promise<Coupon | null> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return null;

    const doc = await CouponModel.findOne({
      code: normalized,
      active: true,
    }).lean();

    const coupon = this.stripDoc<Coupon>(doc);
    if (!coupon || !this.isNotExpired(coupon)) return null;
    return coupon;
  }

  async findAllActive(): Promise<Coupon[]> {
    const docs = await CouponModel.find({ active: true })
      .sort({ code: 1 })
      .lean();
    return this.stripDocs<Coupon>(docs).filter((c) => this.isNotExpired(c));
  }

  async ensureInitialCoupons(): Promise<void> {
    const count = await CouponModel.countDocuments();
    if (count === 0) {
      await CouponModel.insertMany(INITIAL_COUPONS);
      console.log(`[DB] Seeded ${INITIAL_COUPONS.length} initial coupons into MongoDB`);
    }
  }
}
