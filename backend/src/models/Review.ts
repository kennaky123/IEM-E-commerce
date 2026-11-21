import mongoose, { Schema } from 'mongoose';
import { Review, ReviewReply } from '../types';

const ReviewReplySchema = new Schema<ReviewReply>(
  {
    id: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true, trim: true },
    userRole: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    createdAt: { type: String, required: true },
  },
  { _id: false }
);

const ReviewSchema = new Schema<Review>(
  {
    id: { type: String, required: true, unique: true, index: true },
    productId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true, trim: true },
    userRole: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 2000 },
    verifiedPurchase: { type: Boolean, default: false },
    replies: { type: [ReviewReplySchema], default: [] },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
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

ReviewSchema.index({ productId: 1, createdAt: -1 });

export const ReviewModel =
  mongoose.models.Review || mongoose.model<Review>('Review', ReviewSchema);
