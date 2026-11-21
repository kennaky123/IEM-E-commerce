export class AppConfig {
  readonly port: number;
  readonly mongoUri: string;
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly jwtRefreshSecret: string;
  readonly jwtRefreshExpiresIn: string;
  readonly jwtIssuer: string;
  readonly corsOrigin: string[] | boolean;
  readonly freeShippingThreshold: number;
  readonly standardShippingFee: number;
  readonly lowStockThreshold: number;
  readonly monthlyTargetBase: number;
  readonly defaultBrand: string;
  readonly googleClientId: string;
  readonly googleClientSecret: string;
  readonly googleRedirectUri: string;
  readonly storefrontUrl: string;
  readonly adminPortalUrl: string;
  readonly vnpTmnCode: string;
  readonly vnpHashSecret: string;
  readonly vnpUrl: string;
  readonly vnpReturnUrl: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const jwtSecret = env.JWT_SECRET?.trim();
    if (!jwtSecret) {
      throw new Error('[Config] JWT_SECRET environment variable is required.');
    }

    const mongoUri = env.MONGODB_URI?.trim();
    if (!mongoUri) {
      throw new Error('[Config] MONGODB_URI environment variable is required.');
    }

    this.port = Number(env.PORT) || 5000;
    this.mongoUri = mongoUri;
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = env.JWT_EXPIRES_IN?.trim() || '7d';
    this.jwtRefreshSecret =
      env.JWT_REFRESH_SECRET?.trim() || `${jwtSecret}_refresh`;
    this.jwtRefreshExpiresIn = env.JWT_REFRESH_EXPIRES_IN?.trim() || '30d';
    this.jwtIssuer = env.JWT_ISSUER?.trim() || 'moondrop-acoustic-api';
    this.corsOrigin = env.CORS_ORIGIN
      ? env.CORS_ORIGIN.split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : true;
    this.freeShippingThreshold = Number(env.FREE_SHIPPING_THRESHOLD) || 2_000_000;
    this.standardShippingFee = Number(env.STANDARD_SHIPPING_FEE) || 35_000;
    this.lowStockThreshold = Number(env.LOW_STOCK_THRESHOLD) || 8;
    this.monthlyTargetBase = Number(env.MONTHLY_TARGET_BASE) || 50_000_000;
    this.defaultBrand = env.DEFAULT_BRAND?.trim() || 'MOONDROP';
    this.googleClientId = env.GOOGLE_CLIENT_ID?.trim() || '';
    this.googleClientSecret = env.GOOGLE_CLIENT_SECRET?.trim() || '';
    this.googleRedirectUri =
      env.GOOGLE_REDIRECT_URI?.trim() ||
      `http://localhost:${this.port}/api/auth/google/callback`;
    this.storefrontUrl = env.STOREFRONT_URL?.trim() || 'http://localhost:5173';
    this.adminPortalUrl =
      env.ADMIN_PORTAL_URL?.trim() || 'http://localhost:5174';
    this.vnpTmnCode = env.VNP_TMN_CODE?.trim() || 'MOONDROP';
    this.vnpHashSecret =
      env.VNP_HASH_SECRET?.trim() || 'MOONDROPVNPAYSECRETKEY2026SANDBOX';
    this.vnpUrl =
      env.VNP_URL?.trim() ||
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    this.vnpReturnUrl =
      env.VNP_RETURN_URL?.trim() ||
      `http://localhost:${this.port}/api/payment/vnpay/return`;
  }
}
