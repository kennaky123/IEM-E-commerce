export type ComponentCategory =
  | 'IEM'
  | 'DAC_AMP'
  | 'HEADPHONE'
  | 'CABLE'
  | 'ACCESSORY';

export type PinType = '0.78mm 2-Pin' | 'MMCX' | 'Dual 3.5mm' | 'Fixed';
export type PlugType = '3.5mm SE' | '4.4mm Balanced' | '6.35mm SE' | 'USB-C';
export type SoundSignature =
  | 'VDSF Neutral'
  | 'Harman Sub-Bass'
  | 'Studio Reference'
  | 'Warm Musical';

export interface TonalNotes {
  bass: string;
  midrange: string;
  treble: string;
  soundstage: string;
}

export interface ComponentSpecs {
  driverConfig?: string;
  impedanceOhms?: number;
  outputImpedanceOhms?: number;
  sensitivityDb?: number;
  frequencyRange?: string;
  thdPlusN?: string;
  pinType?: PinType;
  plugType?: PlugType;
  supportedOutputs?: PlugType[];
  outputPowerMw?: number;
  dacChip?: string;
  soundSignature?: SoundSignature;
  /** 9-point SPL (dB) at [20, 60, 150, 400, 1000, 2500, 4500, 8000, 16000] Hz */
  frCurve?: number[];
  silkscreenLabels?: string[];
  isNewRelease?: boolean;
  warrantyMonths?: number;
  cavityMaterial?: string;
  diaphragmMaterial?: string;
  crossoverType?: string;
  cableMaterial?: string;
  weightGrams?: number;
  boxContents?: string[];
  tonalNotes?: TonalNotes;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  brand: string;
  category: ComponentCategory;
  price: number;
  originalPrice?: number;
  stock: number;
  rating: number;
  reviewCount: number;
  performanceScore: number;
  image: string;
  gallery?: string[];
  summary: string;
  longDescription?: string;
  highlights: string[];
  specs: ComponentSpecs;
  featured?: boolean;
  createdAt: string;
}

export interface ProductQueryFilters {
  category?: ComponentCategory | 'ALL';
  brand?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  soundSignature?: string;
  pinType?: string;
  plugType?: string;
  sort?: 'featured' | 'price-asc' | 'price-desc' | 'score-desc' | 'rating-desc';
}

export type UserRole = 'customer' | 'admin';
export type AuthProvider = 'local' | 'google';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  authProvider?: AuthProvider;
  googleId?: string;
  avatar?: string;
  createdAt: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  authProvider?: AuthProvider;
  googleId?: string;
  avatar?: string;
  createdAt: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'COD' | 'VIETQR' | 'CARD' | 'VNPAY';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  category: ComponentCategory;
  image: string;
  price: number;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  city: string;
  address: string;
  note?: string;
}

export interface Order {
  id: string;
  orderCode: string;
  userId?: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  shippingFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  vnpayTransactionNo?: string;
  vnpayBankCode?: string;
  paidAt?: string;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  createdAt: string;
  updatedAt: string;
}

export interface OrderQueryFilters {
  search?: string;
  status?: OrderStatus | 'ALL';
}

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Coupon {
  code: string;
  type: DiscountType;
  value: number;
  minSubtotal: number;
  description: string;
  active: boolean;
  expiresAt?: string;
}

export interface PriceQuote {
  subtotal: number;
  discount: number;
  couponCode?: string;
  shippingFee: number;
  total: number;
  freeShippingThreshold: number;
}

export type ChainSlotKey =
  | 'IEM'
  | 'HEADPHONE'
  | 'CABLE'
  | 'DAC_AMP'
  | 'ACCESSORY';

export type BuildSelection = Partial<Record<ComponentCategory, string>>;

export type IssueSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface CompatibilityIssue {
  id: string;
  severity: IssueSeverity;
  code: string;
  title: string;
  detail: string;
  affectedCategories: ComponentCategory[];
}

export interface CompatibilityRuleCheck {
  rule: string;
  passed: boolean | null;
  statusText: string;
}

export interface BuildValidationResult {
  isCompatible: boolean;
  hasWarnings: boolean;
  estimatedSplDb: number | null;
  dampingFactor: number | null;
  outputPowerMw: number | null;
  requiredPowerMw: number | null;
  activeTermination: string | null;
  totalPrice: number;
  selectedCount: number;
  totalSlots: number;
  completenessPercent: number;
  performanceTier: string;
  averageScore: number;
  issues: CompatibilityIssue[];
  checks: CompatibilityRuleCheck[];
}

export interface PresetBuildDefinition {
  id: string;
  name: string;
  tagline: string;
  targetProfile: string;
  synergyHint: string;
  slots: Partial<Record<ComponentCategory, string>>;
}

export interface PopulatedPresetBuild {
  id: string;
  name: string;
  tagline: string;
  targetProfile: string;
  synergyHint: string;
  parts: Partial<Record<ComponentCategory, Product>>;
  validation: BuildValidationResult;
}

export interface MonthlySalesPoint {
  month: string;
  monthIndex: number;
  revenue: number;
  orders: number;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  lowStockCount: number;
  lowStockThreshold: number;
  monthlyTarget: number;
  lowStockProducts: Array<{
    id: string;
    sku: string;
    name: string;
    category: ComponentCategory;
    stock: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    stockValue: number;
  }>;
  monthlySales: MonthlySalesPoint[];
  recentOrders: Order[];
}

export interface ReviewReply {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  replies: ReviewReply[];
  createdAt: string;
  updatedAt: string;
}

export type ReviewSortOption = 'newest' | 'highest' | 'lowest';

export interface ReviewQueryOptions {
  sort?: ReviewSortOption;
  rating?: number;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}
