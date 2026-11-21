import mongoose, { Schema } from 'mongoose';
import { Product } from '../types';

const ProductSchema = new Schema<Product>(
  {
    id: { type: String, required: true, unique: true, index: true },
    sku: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    brand: { type: String, required: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ['IEM', 'DAC_AMP', 'HEADPHONE', 'CABLE', 'ACCESSORY'],
      index: true,
    },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number },
    stock: { type: Number, required: true, min: 0, default: 0 },
    rating: { type: Number, default: 4.9 },
    reviewCount: { type: Number, default: 0 },
    performanceScore: { type: Number, required: true, min: 0, max: 100 },
    image: { type: String, required: true },
    gallery: { type: [String], default: [] },
    summary: { type: String, required: true },
    longDescription: { type: String },
    highlights: { type: [String], default: [] },
    specs: { type: Schema.Types.Mixed, default: {} },
    featured: { type: Boolean, default: false },
    createdAt: { type: String, required: true },
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

ProductSchema.index({ name: 'text', brand: 'text', summary: 'text', sku: 'text' });

export const ProductModel =
  mongoose.models.Product || mongoose.model<Product>('Product', ProductSchema);
