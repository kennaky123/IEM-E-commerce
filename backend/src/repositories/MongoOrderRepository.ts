import { IOrderRepository } from '../interfaces/repositories';
import { OrderModel } from '../models/Order';
import {
  MonthlySalesPoint,
  Order,
  OrderQueryFilters,
  OrderStatus,
  PaymentStatus,
} from '../types';
import { BaseMongoRepository } from './BaseMongoRepository';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export class MongoOrderRepository
  extends BaseMongoRepository<Order>
  implements IOrderRepository
{
  async create(order: Order): Promise<Order> {
    await OrderModel.create(order);
    return order;
  }

  async findByUser(userId: string, email: string): Promise<Order[]> {
    const docs = await OrderModel.find({
      $or: [{ userId }, { customerEmail: email.toLowerCase() }],
    })
      .sort({ createdAt: -1 })
      .lean();
    return this.stripDocs<Order>(docs);
  }

  async findAll(filters: OrderQueryFilters = {}): Promise<Order[]> {
    const query: Record<string, unknown> = {};

    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }

    if (filters.search && filters.search.trim()) {
      const regex = new RegExp(this.escapeRegex(filters.search.trim()), 'i');
      query.$or = [
        { id: { $regex: regex } },
        { orderCode: { $regex: regex } },
        { customerEmail: { $regex: regex } },
        { 'shippingAddress.fullName': { $regex: regex } },
        { 'shippingAddress.phone': { $regex: regex } },
        { 'items.name': { $regex: regex } },
      ];
    }

    const docs = await OrderModel.find(query).sort({ createdAt: -1 }).lean();
    return this.stripDocs<Order>(docs);
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order | null> {
    const updatedAt = new Date().toISOString();
    const doc = await OrderModel.findOneAndUpdate(
      { id },
      { $set: { status, updatedAt } },
      { new: true }
    ).lean();
    return this.stripDoc<Order>(doc);
  }

  async deleteById(id: string): Promise<boolean> {
    const res = await OrderModel.deleteOne({ id });
    return res.deletedCount > 0;
  }

  async aggregateRevenue(): Promise<number> {
    const rows = await OrderModel.aggregate<{ _id: null; totalRevenue: number }>([
      { $match: { status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
    ]);
    return rows[0]?.totalRevenue || 0;
  }

  async aggregateStatusCounts(): Promise<Record<string, number>> {
    const rows = await OrderModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row._id] = row.count;
    }
    return counts;
  }

  async aggregateMonthlySales(year: number): Promise<MonthlySalesPoint[]> {
    const yearPrefix = String(year);
    const rows = await OrderModel.aggregate<{
      _id: number;
      revenue: number;
      orders: number;
    }>([
      {
        $match: {
          status: { $ne: 'CANCELLED' },
          createdAt: { $regex: `^${yearPrefix}-` },
        },
      },
      {
        $group: {
          _id: { $toInt: { $substrBytes: ['$createdAt', 5, 2] } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
    ]);

    const byMonth = new Map<number, { revenue: number; orders: number }>();
    for (const row of rows) {
      byMonth.set(row._id, { revenue: row.revenue, orders: row.orders });
    }

    return MONTH_LABELS.map((label, idx) => {
      const monthNumber = idx + 1;
      const entry = byMonth.get(monthNumber);
      return {
        month: label,
        monthIndex: monthNumber,
        revenue: entry?.revenue ?? 0,
        orders: entry?.orders ?? 0,
      };
    });
  }

  async findRecent(limit: number): Promise<Order[]> {
    const docs = await OrderModel.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return this.stripDocs<Order>(docs);
  }

  async hasUserPurchasedProduct(
    userId: string,
    email: string,
    productId: string
  ): Promise<boolean> {
    const match = await OrderModel.exists({
      status: { $ne: 'CANCELLED' },
      'items.productId': productId,
      $or: [{ userId }, { customerEmail: email.toLowerCase() }],
    });
    return Boolean(match);
  }

  async findByIdOrCode(idOrCode: string): Promise<Order | null> {
    const doc = await OrderModel.findOne({
      $or: [{ id: idOrCode }, { orderCode: idOrCode }],
    }).lean();
    return this.stripDoc<Order>(doc);
  }

  async updatePaymentResult(
    id: string,
    patch: {
      paymentStatus: PaymentStatus;
      status?: OrderStatus;
      vnpayTransactionNo?: string;
      vnpayBankCode?: string;
      paidAt?: string;
    }
  ): Promise<Order | null> {
    const doc = await OrderModel.findOneAndUpdate(
      { id },
      { $set: { ...patch, updatedAt: new Date().toISOString() } },
      { new: true }
    ).lean();
    return this.stripDoc<Order>(doc);
  }
}
