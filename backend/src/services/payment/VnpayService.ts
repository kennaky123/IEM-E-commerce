import crypto from 'node:crypto';
import { AppConfig } from '../../config/AppConfig';
import {
  IVnpayService,
  VnpayCreateUrlInput,
  VnpayVerifyResult,
} from '../../interfaces/services';

const VNPAY_RESPONSE_MESSAGES: Record<string, string> = {
  '00': 'Giao dịch thanh toán VNPay thành công.',
  '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
  '09': 'Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
  '10': 'Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.',
  '11': 'Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
  '12': 'Thẻ/Tài khoản của khách hàng bị khóa.',
  '13': 'Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
  '24': 'Khách hàng hủy giao dịch thanh toán VNPay.',
  '51': 'Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
  '65': 'Tài khoản của quý khách đã vượt quá hạn mức giao dịch trong ngày.',
  '75': 'Ngân hàng thanh toán đang bảo trì.',
  '79': 'Quý khách nhập sai mật khẩu thanh toán quá số lần quy định.',
};

export class VnpayService implements IVnpayService {
  constructor(private readonly config: AppConfig) {}

  private formatVnpDate(date = new Date()): string {
    // VNPay requires GMT+7 timestamp in YYYYMMDDHHmmss
    const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000;
    const gmt7 = new Date(utcMs + 7 * 3_600_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${gmt7.getFullYear()}${pad(gmt7.getMonth() + 1)}${pad(
      gmt7.getDate()
    )}${pad(gmt7.getHours())}${pad(gmt7.getMinutes())}${pad(gmt7.getSeconds())}`;
  }

  private sortAndEncodeParams(params: Record<string, string>): {
    sorted: Record<string, string>;
    signData: string;
  } {
    const keys = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== '')
      .sort();

    const sorted: Record<string, string> = {};
    const pairs: string[] = [];

    for (const key of keys) {
      const val = params[key];
      sorted[key] = val;
      pairs.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(val).replace(
          /%20/g,
          '+'
        )}`
      );
    }

    return { sorted, signData: pairs.join('&') };
  }

  private computeHmacSha512(signData: string): string {
    return crypto
      .createHmac('sha512', this.config.vnpHashSecret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');
  }

  createPaymentUrl(input: VnpayCreateUrlInput): {
    paymentUrl: string;
    txnRef: string;
    params: Record<string, string>;
  } {
    const baseParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.config.vnpTmnCode,
      vnp_Locale: input.locale || 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: input.orderId,
      vnp_OrderInfo: `Thanh toan don hang ${input.orderCode}`,
      vnp_OrderType: 'other',
      vnp_Amount: String(Math.round(input.amountVnd) * 100),
      vnp_ReturnUrl: input.returnUrl || this.config.vnpReturnUrl,
      vnp_IpAddr: input.ipAddr || '127.0.0.1',
      vnp_CreateDate: this.formatVnpDate(),
    };

    if (input.bankCode?.trim()) {
      baseParams.vnp_BankCode = input.bankCode.trim();
    }

    const { sorted, signData } = this.sortAndEncodeParams(baseParams);
    const secureHash = this.computeHmacSha512(signData);
    const paymentUrl = `${this.config.vnpUrl}?${signData}&vnp_SecureHash=${secureHash}`;

    return {
      paymentUrl,
      txnRef: input.orderId,
      params: { ...sorted, vnp_SecureHash: secureHash },
    };
  }

  verifyReturnQuery(query: Record<string, unknown>): VnpayVerifyResult {
    const receivedHash = String(query.vnp_SecureHash ?? '');
    const rawParams: Record<string, string> = {};

    for (const [key, value] of Object.entries(query)) {
      if (
        !key.startsWith('vnp_') ||
        key === 'vnp_SecureHash' ||
        key === 'vnp_SecureHashType'
      ) {
        continue;
      }
      if (value !== undefined && value !== null && String(value) !== '') {
        rawParams[key] = Array.isArray(value)
          ? String(value[0])
          : String(value);
      }
    }

    const { signData } = this.sortAndEncodeParams(rawParams);
    const expectedHash = this.computeHmacSha512(signData);
    const isValidSignature =
      Boolean(receivedHash) &&
      receivedHash.toLowerCase() === expectedHash.toLowerCase();

    const responseCode = rawParams.vnp_ResponseCode || '99';
    const transactionStatus = rawParams.vnp_TransactionStatus || responseCode;
    const orderId = rawParams.vnp_TxnRef || '';
    const amountVnd = Math.round(Number(rawParams.vnp_Amount || 0) / 100);
    const transactionNo = rawParams.vnp_TransactionNo || '';
    const bankCode = rawParams.vnp_BankCode || 'VNPAY';
    const payDate = rawParams.vnp_PayDate || '';

    const isSuccess =
      isValidSignature && responseCode === '00' && transactionStatus === '00';

    const message = !isValidSignature
      ? 'Chữ ký bảo mật VNPay (vnp_SecureHash) không hợp lệ.'
      : VNPAY_RESPONSE_MESSAGES[responseCode] ||
        `Giao dịch VNPay không thành công (Mã lỗi ${responseCode}).`;

    return {
      isValidSignature,
      isSuccess,
      orderId,
      amountVnd,
      responseCode,
      transactionNo,
      bankCode,
      payDate,
      message,
    };
  }

  buildSignedCallbackParams(input: {
    orderId: string;
    amountVnd: number;
    responseCode?: string;
    bankCode?: string;
    transactionNo?: string;
  }): Record<string, string> {
    const code = input.responseCode || '00';
    const nowVnp = this.formatVnpDate();
    const rawParams: Record<string, string> = {
      vnp_Amount: String(Math.round(input.amountVnd) * 100),
      vnp_BankCode: input.bankCode?.trim() || 'NCB',
      vnp_CardType: 'ATM',
      vnp_OrderInfo: `Thanh toan don hang ${input.orderId}`,
      vnp_PayDate: nowVnp,
      vnp_ResponseCode: code,
      vnp_TmnCode: this.config.vnpTmnCode,
      vnp_TransactionNo:
        input.transactionNo || String(Date.now()).slice(-8),
      vnp_TransactionStatus: code,
      vnp_TxnRef: input.orderId,
    };

    const { sorted, signData } = this.sortAndEncodeParams(rawParams);
    const secureHash = this.computeHmacSha512(signData);

    return {
      ...sorted,
      vnp_SecureHash: secureHash,
    };
  }
}
