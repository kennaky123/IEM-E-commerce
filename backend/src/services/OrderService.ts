import crypto from 'node:crypto';
import { BadRequestError, NotFoundError } from '../errors/AppError';
import { IOrderRepository, IProductRepository } from '../interfaces/repositories';
import { IPricingService, VnpayVerifyResult } from '../interfaces/services';
import {
  Order,
  OrderItem,
  OrderQueryFilters,
  OrderStatus,
  PaymentMethod,
  PriceQuote,
  SafeUser,
  ShippingAddress,
} from '../types';

export const VALID_ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

export interface PlaceOrderInput {
  items?: Array<{ productId: string; quantity: number }>;
  shippingAddress?: ShippingAddress;
  paymentMethod?: PaymentMethod;
  couponCode?: string;
  customerEmail?: string;
}

export class OrderService {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly productRepo: IProductRepository,
    private readonly pricingService: IPricingService
  ) {}

  async previewQuote(
    items: Array<{ productId: string; quantity: number }>,
    couponCode?: string
  ): Promise<PriceQuote> {
    if (!Array.isArray(items) || items.length === 0) {
      return this.pricingService.calculateQuote(0, couponCode);
    }

    const productsMap = await this.productRepo.findByIds(
      items.map((i) => i.productId)
    );

    let subtotal = 0;
    for (const reqItem of items) {
      const qty = Math.max(1, Math.floor(Number(reqItem.quantity) || 1));
      const product = productsMap.get(reqItem.productId);
      if (!product) {
        throw new NotFoundError(`Product not found: ${reqItem.productId}`);
      }
      subtotal += product.price * qty;
    }

    return this.pricingService.calculateQuote(subtotal, couponCode);
  }

  async placeOrder(input: PlaceOrderInput, user?: SafeUser): Promise<Order> {
    const { items, shippingAddress, paymentMethod, couponCode, customerEmail } =
      input;

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Order must include at least one item.');
    }

    if (
      !shippingAddress?.fullName?.trim() ||
      !shippingAddress?.phone?.trim() ||
      !shippingAddress?.city?.trim() ||
      !shippingAddress?.address?.trim()
    ) {
      throw new BadRequestError(
        'Complete shipping details (fullName, phone, city, address) are required.'
      );
    }

    const productsMap = await this.productRepo.findByIds(
      items.map((i) => i.productId)
    );

    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (const reqItem of items) {
      const qty = Math.max(1, Math.floor(Number(reqItem.quantity) || 1));
      const product = productsMap.get(reqItem.productId);
      if (!product) {
        throw new NotFoundError(`Product not found: ${reqItem.productId}`);
      }
      if (product.stock < qty) {
        throw new BadRequestError(
          `Insufficient stock for ${product.name}. Remaining: ${product.stock}`
        );
      }

      orderItems.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        image: product.image,
        price: product.price,
        quantity: qty,
      });
      subtotal += product.price * qty;
    }

    const quote = await this.pricingService.calculateQuote(
      subtotal,
      couponCode
    );
    const now = new Date().toISOString();

    const order: Order = {
      id: `ord-${crypto.randomBytes(5).toString('hex')}`,
      orderCode: `SL-${new Date().getFullYear().toString().slice(-2)}${String(
        new Date().getMonth() + 1
      ).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: user?.id,
      customerEmail:
        user?.email || customerEmail?.trim() || 'guest@moondrop.vn',
      items: orderItems,
      subtotal: quote.subtotal,
      discount: quote.discount,
      couponCode: quote.couponCode,
      shippingFee: quote.shippingFee,
      total: quote.total,
      paymentMethod: paymentMethod || 'COD',
      paymentStatus: 'UNPAID',
      status: 'PENDING',
      shippingAddress: {
        fullName: shippingAddress.fullName.trim(),
        phone: shippingAddress.phone.trim(),
        city: shippingAddress.city.trim(),
        address: shippingAddress.address.trim(),
        note: shippingAddress.note?.trim(),
      },
      createdAt: now,
      updatedAt: now,
    };

    const deducted: Array<{ productId: string; quantity: number }> = [];
    try {
      for (const item of order.items) {
        const ok = await this.productRepo.deductStock(
          item.productId,
          item.quantity
        );
        if (!ok) {
          throw new BadRequestError(`Insufficient stock for ${item.name}`);
        }
        deducted.push({ productId: item.productId, quantity: item.quantity });
      }
      return await this.orderRepo.create(order);
    } catch (err) {
      for (const rollback of deducted) {
        await this.productRepo.restoreStock(
          rollback.productId,
          rollback.quantity
        );
      }
      throw err;
    }
  }

  async getUserOrders(userId: string, email: string): Promise<Order[]> {
    return this.orderRepo.findByUser(userId, email);
  }

  async listAllOrders(filters: OrderQueryFilters = {}): Promise<Order[]> {
    return this.orderRepo.findAll(filters);
  }

  async updateStatus(id: string, status?: OrderStatus): Promise<Order> {
    if (!status || !VALID_ORDER_STATUSES.includes(status)) {
      throw new BadRequestError(
        `Status must be one of: ${VALID_ORDER_STATUSES.join(', ')}`
      );
    }
    const updated = await this.orderRepo.updateStatus(id, status);
    if (!updated) {
      throw new NotFoundError('Order not found.');
    }
    return updated;
  }

  async getOrderByIdOrCode(idOrCode: string): Promise<Order> {
    const order = await this.orderRepo.findByIdOrCode(idOrCode.trim());
    if (!order) {
      throw new NotFoundError('Order not found.');
    }
    return order;
  }

  async recordVnpayPayment(verifyResult: VnpayVerifyResult): Promise<Order> {
    if (!verifyResult.isValidSignature) {
      throw new BadRequestError(
        'Chữ ký bảo mật VNPay (vnp_SecureHash) không hợp lệ.'
      );
    }

    const order = await this.getOrderByIdOrCode(verifyResult.orderId);
    const nextPaymentStatus = verifyResult.isSuccess ? 'PAID' : 'FAILED';
    const nextOrderStatus: OrderStatus =
      verifyResult.isSuccess && order.status === 'PENDING'
        ? 'CONFIRMED'
        : order.status;

    const updated = await this.orderRepo.updatePaymentResult(order.id, {
      paymentStatus: nextPaymentStatus,
      status: nextOrderStatus,
      vnpayTransactionNo: verifyResult.transactionNo || undefined,
      vnpayBankCode: verifyResult.bankCode || undefined,
      paidAt: verifyResult.isSuccess ? new Date().toISOString() : undefined,
    });

    if (!updated) {
      throw new NotFoundError('Order not found.');
    }
    return updated;
  }

  async deleteOrder(id: string): Promise<void> {
    const ok = await this.orderRepo.deleteById(id);
    if (!ok) {
      throw new NotFoundError('Order not found.');
    }
  }
}
