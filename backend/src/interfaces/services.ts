import {
  BuildValidationResult,
  ComponentCategory,
  Coupon,
  DiscountType,
  PriceQuote,
  Product,
  SafeUser,
} from '../types';

export type JwtTokenType = 'access' | 'refresh';

export interface JwtTokenClaims extends SafeUser {
  tokenType: JwtTokenType;
  jti: string;
  iat?: number;
  exp?: number;
  iss?: string;
}

export interface JwtTokenPair {
  token: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  expiresAt: string;
}

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
  emailVerified: boolean;
}

export interface GoogleOAuthConfigInfo {
  enabled: boolean;
  clientId: string | null;
  redirectUri: string;
  authUrl: string;
}

export interface IGoogleOAuthService {
  getConfigInfo(state?: string): GoogleOAuthConfigInfo;
  getAuthorizationUrl(options?: { state?: string; redirectUri?: string }): string;
  verifyIdToken(idToken: string): Promise<GoogleUserProfile>;
  verifyAccessToken(accessToken: string): Promise<GoogleUserProfile>;
  exchangeCodeForProfile(
    code: string,
    redirectUri?: string
  ): Promise<GoogleUserProfile>;
}

export interface ITokenService {
  sign(user: SafeUser): string;
  signRefreshToken(user: SafeUser): string;
  signTokenPair(user: SafeUser): JwtTokenPair;
  verify(token: string): SafeUser;
  verifyRefreshToken(token: string): JwtTokenClaims;
  decode(token: string): JwtTokenClaims | null;
  revoke(token: string): void;
  isRevoked(jti: string): boolean;
}

export interface IPasswordHasher {
  hash(plain: string): string;
  compare(plain: string, hashed: string): boolean;
}

export interface IDiscountStrategy {
  readonly type: DiscountType;
  calculate(subtotal: number, coupon: Coupon): number;
}

export interface IPricingService {
  calculateQuote(subtotal: number, couponCode?: string): Promise<PriceQuote>;
  validateCoupon(
    subtotal: number,
    couponCode: string
  ): Promise<{ coupon: Coupon; discount: number }>;
  listActiveCoupons(): Promise<Coupon[]>;
}

export interface ICompatibilityService {
  validateChain(
    parts: Partial<Record<ComponentCategory, Product | undefined | null>>
  ): BuildValidationResult;
  checkCandidate(
    candidate: Product,
    currentParts: Partial<Record<ComponentCategory, Product | undefined | null>>
  ): { compatible: boolean; reason?: string };
  findCompatiblePairings(
    target: Product,
    catalog: Product[],
    limit?: number
  ): Product[];
}

export interface VnpayCreateUrlInput {
  orderId: string;
  orderCode: string;
  amountVnd: number;
  ipAddr: string;
  bankCode?: string;
  locale?: 'vn' | 'en';
  returnUrl?: string;
}

export interface VnpayVerifyResult {
  isValidSignature: boolean;
  isSuccess: boolean;
  orderId: string;
  amountVnd: number;
  responseCode: string;
  transactionNo: string;
  bankCode: string;
  payDate: string;
  message: string;
}

export interface IVnpayService {
  createPaymentUrl(input: VnpayCreateUrlInput): {
    paymentUrl: string;
    txnRef: string;
    params: Record<string, string>;
  };
  verifyReturnQuery(query: Record<string, unknown>): VnpayVerifyResult;
  buildSignedCallbackParams(input: {
    orderId: string;
    amountVnd: number;
    responseCode?: string;
    bankCode?: string;
    transactionNo?: string;
  }): Record<string, string>;
}
