import mongoose from 'mongoose';
import { CouponModel } from '../models/Coupon';
import { OrderModel } from '../models/Order';
import { PresetBuildModel } from '../models/PresetBuild';
import { ProductModel } from '../models/Product';
import { ReviewModel } from '../models/Review';
import { UserModel } from '../models/User';

export type DbMode = 'mongodb' | 'disconnected';

export class DatabaseManager {
  private mode: DbMode = 'disconnected';

  async connect(uri: string): Promise<DbMode> {
    const normalized = uri?.trim();
    if (!normalized) {
      this.mode = 'disconnected';
      throw new Error('[DB] MONGODB_URI environment variable is required.');
    }

    mongoose.set('strictQuery', true);
    await mongoose.connect(normalized, {
      serverSelectionTimeoutMS: 10000,
    });
    this.mode = 'mongodb';
    console.log(
      `[DB] Connected to MongoDB (${mongoose.connection.name}) at ${mongoose.connection.host}`
    );
    return this.mode;
  }

  async disconnect(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    this.mode = 'disconnected';
  }

  getMode(): DbMode {
    return this.mode;
  }

  async verifyCollections(): Promise<void> {
    if (this.mode !== 'mongodb') {
      throw new Error('MongoDB connection must be established before verifying collections.');
    }

    const [
      productCount,
      presetCount,
      userCount,
      orderCount,
      couponCount,
      reviewCount,
    ] = await Promise.all([
      ProductModel.countDocuments(),
      PresetBuildModel.countDocuments(),
      UserModel.countDocuments(),
      OrderModel.countDocuments(),
      CouponModel.countDocuments(),
      ReviewModel.countDocuments(),
    ]);

    console.log(
      `[DB] Collections ready — products: ${productCount}, presets: ${presetCount}, users: ${userCount}, orders: ${orderCount}, coupons: ${couponCount}, reviews: ${reviewCount}`
    );
  }
}
