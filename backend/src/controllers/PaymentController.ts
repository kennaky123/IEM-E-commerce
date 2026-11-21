import { Request, Response } from 'express';
import { AppConfig } from '../config/AppConfig';
import { BadRequestError } from '../errors/AppError';
import { IVnpayService } from '../interfaces/services';
import { OrderService } from '../services/OrderService';
import { BaseController } from './BaseController';

export class PaymentController extends BaseController {
  constructor(
    private readonly vnpayService: IVnpayService,
    private readonly orderService: OrderService,
    private readonly config: AppConfig
  ) {
    super();
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || '127.0.0.1';
  }

  createVnpayUrl = this.handle(async (req, res: Response) => {
    const body = (req.body ?? {}) as {
      orderId?: string;
      bankCode?: string;
      locale?: 'vn' | 'en';
      returnUrl?: string;
    };

    if (!body.orderId?.trim()) {
      throw new BadRequestError('orderId is required.');
    }

    const order = await this.orderService.getOrderByIdOrCode(body.orderId);
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestError('Order is already paid.');
    }

    const created = this.vnpayService.createPaymentUrl({
      orderId: order.id,
      orderCode: order.orderCode,
      amountVnd: order.total,
      ipAddr: this.getClientIp(req),
      bankCode: body.bankCode,
      locale: body.locale,
      returnUrl: body.returnUrl,
    });

    res.json({
      paymentUrl: created.paymentUrl,
      txnRef: created.txnRef,
      order,
    });
  });

  verifyVnpayReturn = this.handle(async (req, res: Response) => {
    const result = this.vnpayService.verifyReturnQuery(
      req.query as Record<string, unknown>
    );

    let order = null;
    if (result.isValidSignature && result.orderId) {
      order = await this.orderService.recordVnpayPayment(result);
    }

    res.json({ result, order });
  });

  vnpayReturnRedirect = this.handle(async (req, res: Response) => {
    const result = this.vnpayService.verifyReturnQuery(
      req.query as Record<string, unknown>
    );

    if (result.isValidSignature && result.orderId) {
      await this.orderService.recordVnpayPayment(result).catch(() => null);
    }

    res.redirect(
      `${this.config.storefrontUrl}/orders?vnpay_status=${
        result.isSuccess ? 'success' : 'failed'
      }&orderId=${encodeURIComponent(result.orderId)}&code=${encodeURIComponent(
        result.responseCode
      )}`
    );
  });

  vnpayIpn = this.handle(async (req, res: Response) => {
    const result = this.vnpayService.verifyReturnQuery(
      req.query as Record<string, unknown>
    );

    if (!result.isValidSignature) {
      res.status(200).json({ RspCode: '97', Message: 'Invalid Checksum' });
      return;
    }

    if (!result.orderId) {
      res.status(200).json({ RspCode: '01', Message: 'Order not found' });
      return;
    }

    let order;
    try {
      order = await this.orderService.getOrderByIdOrCode(result.orderId);
    } catch {
      res.status(200).json({ RspCode: '01', Message: 'Order not found' });
      return;
    }

    if (Math.round(order.total) !== result.amountVnd) {
      res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
      return;
    }

    if (order.paymentStatus === 'PAID') {
      res
        .status(200)
        .json({ RspCode: '02', Message: 'Order already confirmed' });
      return;
    }

    await this.orderService.recordVnpayPayment(result);
    res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
  });

  completeSandboxPayment = this.handle(async (req, res: Response) => {
    const body = (req.body ?? {}) as {
      orderId?: string;
      bankCode?: string;
      responseCode?: string;
    };

    if (!body.orderId?.trim()) {
      throw new BadRequestError('orderId is required.');
    }

    const existing = await this.orderService.getOrderByIdOrCode(body.orderId);
    const signedParams = this.vnpayService.buildSignedCallbackParams({
      orderId: existing.id,
      amountVnd: existing.total,
      bankCode: body.bankCode,
      responseCode: body.responseCode || '00',
    });

    const result = this.vnpayService.verifyReturnQuery(signedParams);
    const order = await this.orderService.recordVnpayPayment(result);

    res.json({ result, order, signedParams });
  });
}
