export type ComponentCategory =
  | 'IEM'
  | 'DAC_AMP'
  | 'HEADPHONE'
  | 'CABLE'
  | 'ACCESSORY';

export type SoundSignature =
  | 'VDSF Neutral'
  | 'Harman Sub-Bass'
  | 'Studio Reference'
  | 'Warm Musical';

export type PinType =
  | '0.78mm 2-Pin'
  | 'MMCX'
  | 'Dual 3.5mm'
  | 'Fixed';

export type PlugType =
  | '3.5mm SE'
  | '4.4mm Balanced'
  | '6.35mm SE'
  | 'USB-C';

export interface ComponentSpecs {
  driverConfig?: string;
  dacChip?: string;
  soundSignature?: SoundSignature;
  pinType?: PinType;
  plugType?: PlugType;
  supportedOutputs?: PlugType[];
  impedanceOhms?: number;
  outputImpedanceOhms?: number;
  sensitivityDb?: number;
  outputPowerMw?: number;
  thdPlusN?: string;
  frequencyRange?: string;
  silkscreenLabels?: string[];
  isNewRelease?: boolean;
  frCurve?: number[];
  [key: string]: unknown;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug?: string;
  category: ComponentCategory;
  price: number;
  originalPrice?: number;
  stock: number;
  brand: string;
  image: string;
  gallery?: string[];
  summary: string;
  longDescription?: string;
  featured?: boolean;
  rating?: number;
  reviewCount?: number;
  performanceScore?: number;
  specs: ComponentSpecs;
  createdAt?: string;
  updatedAt?: string;
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
  sku?: string;
  name: string;
  category?: ComponentCategory;
  price: number;
  quantity: number;
  image?: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  address?: string;
  street?: string;
  city: string;
  district?: string;
  note?: string;
}

export interface Order {
  id: string;
  orderCode?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  promoCode?: string;
  shippingFee?: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  vnpayTransactionNo?: string;
  vnpayBankCode?: string;
  paidAt?: string;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  customerEmail?: string;
  customerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'customer';
  authProvider?: 'local' | 'google';
  googleId?: string;
  avatar?: string;
  createdAt: string;
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
  lowStockThreshold?: number;
  monthlyTarget?: number;
  lowStockProducts?: Array<{
    id: string;
    sku: string;
    name: string;
    category: ComponentCategory;
    stock: number;
  }>;
  categoryBreakdown?: Array<{
    category: ComponentCategory;
    count: number;
    stockValue: number;
  }>;
  categoryDistribution?: Array<{
    category: ComponentCategory;
    count: number;
    totalStock: number;
  }>;
  monthlySales?: MonthlySalesPoint[];
  recentOrders: Order[];
}

export interface MediaImageItem {
  filename: string;
  url: string;
  sizeBytes: number;
  suggestedName: string;
}
