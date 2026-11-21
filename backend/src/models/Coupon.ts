import mongoose, { Schema } from 'mongoose';
import { Coupon } from '../types';

const CouponSchema = new Schema<Coupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, index: true },
    type: { type: String, required: true, enum: ['PERCENTAGE', 'FIXED'] },
    value: { type: Number, required: true, min: 0 },
    minSubtotal: { type: Number, default: 0, min: 0 },
    description: { type: String, required: true },
    active: { type: Boolean, default: true, index: true },
    expiresAt: { type: String },
  },
  {
    versionKey: false,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret._id;
        return ret;
      },
    },
  }
);

export const CouponModel =
  mongoose.models.Coupon || mongoose.model<Coupon>('Coupon', CouponSchema);
