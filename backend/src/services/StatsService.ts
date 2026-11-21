import { AppConfig } from '../config/AppConfig';
import { IOrderRepository, IProductRepository } from '../interfaces/repositories';
import { DashboardStats } from '../types';

export class StatsService {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly orderRepo: IOrderRepository,
    private readonly config: AppConfig
  ) {}

  async getDashboardStats(): Promise<DashboardStats> {
    const currentYear = new Date().getFullYear();

    const [
      totalRevenue,
      statusCounts,
      categoryBreakdown,
      lowStockProducts,
      monthlySales,
      recentOrders,
    ] = await Promise.all([
      this.orderRepo.aggregateRevenue(),
      this.orderRepo.aggregateStatusCounts(),
      this.productRepo.aggregateCategoryBreakdown(),
      this.productRepo.findLowStock(this.config.lowStockThreshold),
      this.orderRepo.aggregateMonthlySales(currentYear),
      this.orderRepo.findRecent(6),
    ]);

    const totalOrders = Object.values(statusCounts).reduce(
      (sum, c) => sum + c,
      0
    );
    const pendingOrders = statusCounts['PENDING'] || 0;
    const totalProducts = categoryBreakdown.reduce(
      (sum, item) => sum + item.count,
      0
    );
    const monthlyTarget = Math.max(
      this.config.monthlyTargetBase,
      Math.ceil((totalRevenue * 1.25) / 10_000_000) * 10_000_000
    );

    return {
      totalRevenue,
      totalOrders,
      pendingOrders,
      totalProducts,
      lowStockCount: lowStockProducts.length,
      lowStockThreshold: this.config.lowStockThreshold,
      monthlyTarget,
      lowStockProducts,
      categoryBreakdown,
      monthlySales,
      recentOrders,
    };
  }
}
