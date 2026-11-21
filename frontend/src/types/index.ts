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

export type UserRole = 'customer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  authProvider?: 'local' | 'google';
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

export type BuildPartsMap = Partial<Record<ComponentCategory, Product>>;

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

export interface PresetBuild {
  id: string;
  name: string;
  tagline: string;
  targetProfile: string;
  synergyHint: string;
  parts: Partial<Record<ComponentCategory, Product>>;
  validation: BuildValidationResult;
}

export interface CartItem {
  product: Product;
  quantity: number;
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

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}
