import {
  ComponentCategory,
  Coupon,
  MonthlySalesPoint,
  Order,
  OrderQueryFilters,
  OrderStatus,
  PaymentStatus,
  PresetBuildDefinition,
  Product,
  ProductQueryFilters,
  Review,
  ReviewQueryOptions,
  ReviewReply,
  ReviewSummary,
  SafeUser,
  User,
  UserRole,
} from '../types';

export interface ProductMatchingSummary {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  rating: number;
}

export interface LowStockProductSummary {
  id: string;
  sku: string;
  name: string;
  category: ComponentCategory;
  stock: number;
}

export interface CategoryBreakdownItem {
  category: string;
  count: number;
  stockValue: number;
}

export interface IProductReader {
  findAll(filters?: ProductQueryFilters): Promise<Product[]>;
  findByIdOrSlug(id: string): Promise<Product | null>;
  findByIds(ids: string[]): Promise<Map<string, Product>>;
  findMinimalForMatching(): Promise<ProductMatchingSummary[]>;
  count(): Promise<number>;
  aggregateCategoryBreakdown(): Promise<CategoryBreakdownItem[]>;
  findLowStock(threshold: number): Promise<LowStockProductSummary[]>;
}

export interface IProductWriter {
  create(product: Product): Promise<Product>;
  updateById(id: string, patch: Partial<Product>): Promise<Product | null>;
  deleteById(id: string): Promise<boolean>;
  deductStock(productId: string, quantity: number): Promise<boolean>;
  restoreStock(productId: string, quantity: number): Promise<void>;
}

export interface IProductRepository extends IProductReader, IProductWriter {}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findFirstByRole(role: UserRole): Promise<User | null>;
  findAll(): Promise<SafeUser[]>;
  countByRole(role: UserRole): Promise<number>;
  create(user: User): Promise<User>;
  linkGoogleAccount(
    userId: string,
    googleId: string,
    avatar?: string
  ): Promise<User | null>;
  updateRole(id: string, role: UserRole): Promise<SafeUser | null>;
  deleteById(id: string): Promise<boolean>;
}

export interface IOrderRepository {
  create(order: Order): Promise<Order>;
  findByUser(userId: string, email: string): Promise<Order[]>;
  findAll(filters?: OrderQueryFilters): Promise<Order[]>;
  updateStatus(id: string, status: OrderStatus): Promise<Order | null>;
  deleteById(id: string): Promise<boolean>;
  aggregateRevenue(): Promise<number>;
  aggregateStatusCounts(): Promise<Record<string, number>>;
  aggregateMonthlySales(year: number): Promise<MonthlySalesPoint[]>;
  findRecent(limit: number): Promise<Order[]>;
  hasUserPurchasedProduct(
    userId: string,
    email: string,
    productId: string
  ): Promise<boolean>;
  findByIdOrCode(idOrCode: string): Promise<Order | null>;
  updatePaymentResult(
    id: string,
    patch: {
      paymentStatus: PaymentStatus;
      status?: OrderStatus;
      vnpayTransactionNo?: string;
      vnpayBankCode?: string;
      paidAt?: string;
    }
  ): Promise<Order | null>;
}

export interface IPresetRepository {
  findAll(): Promise<PresetBuildDefinition[]>;
  count(): Promise<number>;
}

export interface ICouponRepository {
  findActiveByCode(code: string): Promise<Coupon | null>;
  findAllActive(): Promise<Coupon[]>;
  ensureInitialCoupons(): Promise<void>;
}

export interface IReviewRepository {
  findByProduct(productId: string, options?: ReviewQueryOptions): Promise<Review[]>;
  findById(id: string): Promise<Review | null>;
  create(review: Review): Promise<Review>;
  updateById(
    id: string,
    patch: Partial<Pick<Review, 'rating' | 'comment' | 'updatedAt'>>
  ): Promise<Review | null>;
  deleteById(id: string): Promise<boolean>;
  addReply(reviewId: string, reply: ReviewReply): Promise<Review | null>;
  removeReply(reviewId: string, replyId: string): Promise<Review | null>;
  aggregateProductStats(productId: string): Promise<ReviewSummary>;
  count(): Promise<number>;
}
