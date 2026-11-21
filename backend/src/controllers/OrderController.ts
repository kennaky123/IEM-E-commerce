import { Response } from 'express';
import { UnauthorizedError } from '../errors/AppError';
import { AuthRequest } from '../middleware/AuthMiddleware';
import { OrderService } from '../services/OrderService';
import { OrderStatus } from '../types';
import { BaseController } from './BaseController';

export class OrderController extends BaseController {
  constructor(private readonly orderService: OrderService) {
    super();
  }

  previewQuote = this.handle(async (req, res: Response) => {
    const { items, couponCode } = req.body as {
      items?: Array<{ productId: string; quantity: number }>;
      couponCode?: string;
    };
    const quote = await this.orderService.previewQuote(
      Array.isArray(items) ? items : [],
      couponCode
    );
    res.json({ quote });
  });

  placeOrder = this.handle<AuthRequest>(async (req, res: Response) => {
    const order = await this.orderService.placeOrder(req.body, req.user);
    res.status(201).json({ order });
  });

  getMyOrders = this.handle<AuthRequest>(async (req, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Unauthorized');
    }
    const orders = await this.orderService.getUserOrders(
      req.user.id,
      req.user.email
    );
    res.json({ orders });
  });

  listAll = this.handle<AuthRequest>(async (req, res: Response) => {
    const { search, status } = req.query as {
      search?: string;
      status?: OrderStatus | 'ALL';
    };
    const orders = await this.orderService.listAllOrders({ search, status });
    res.json({ orders, total: orders.length });
  });

  updateStatus = this.handle<AuthRequest>(async (req, res: Response) => {
    const { status } = req.body as { status?: OrderStatus };
    const updated = await this.orderService.updateStatus(
      String(req.params.id),
      status
    );
    res.json({ order: updated });
  });

  remove = this.handle<AuthRequest>(async (req, res: Response) => {
    await this.orderService.deleteOrder(String(req.params.id));
    res.json({ ok: true });
  });
}
