import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import { ENV } from '../config/env';
import {
  BuildValidationResult,
  ComponentCategory,
  Coupon,
  Order,
  PaymentMethod,
  PresetBuild,
  PriceQuote,
  Product,
  Review,
  ReviewReply,
  ReviewSortOption,
  ReviewSummary,
  ShippingAddress,
  User,
} from '../types';
import { DecodedJwtPayload, jwtService } from './jwtService';

export interface AuthResponse {
  user: User;
  token: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: string;
  expiresAt?: string;
}

export interface GoogleOAuthConfig {
  enabled: boolean;
  clientId: string | null;
  redirectUri: string;
  authUrl: string;
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

export interface MediaImageItem {
  filename: string;
  url: string;
  sizeBytes: number;
  suggestedName: string;
}

export interface StudioSonglongSet {
  folder: string;
  title: string;
  images: string[];
  cover: string;
  count: number;
  productId?: string | null;
  product?: {
    id: string;
    name: string;
    price: number;
    rating: number;
    sku: string;
  } | null;
}

export interface BuildCandidateEvaluation {
  product: Product;
  compat: { compatible: boolean; reason?: string };
}

interface RetryableAxiosConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

class HttpClient {
  readonly client: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(private readonly baseUrl: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      if (!config.headers.Authorization) {
        const token = jwtService.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (err: AxiosError<{ error?: string }>) => {
        const originalConfig = err.config as RetryableAxiosConfig | undefined;
        const status = err.response?.status;
        const url = originalConfig?.url || '';

        if (
          status === 401 &&
          originalConfig &&
          !originalConfig._retry &&
          jwtService.getAccessToken() &&
          !url.startsWith('/auth/login') &&
          !url.startsWith('/auth/register') &&
          !url.startsWith('/auth/demo') &&
          !url.startsWith('/auth/refresh') &&
          !url.startsWith('/auth/logout') &&
          !url.startsWith('/auth/google')
        ) {
          originalConfig._retry = true;
          const nextToken = await this.tryRefreshToken();
          if (nextToken) {
            originalConfig.headers.Authorization = `Bearer ${nextToken}`;
            return this.client.request(originalConfig);
          }
        }

        const message =
          err.response?.data?.error ||
          err.message ||
          `Request failed (${status ?? 'network'})`;
        return Promise.reject(new Error(message));
      }
    );
  }

  private async tryRefreshToken(): Promise<string | null> {
    const refreshToken = jwtService.getRefreshToken();
    if (!refreshToken) {
      jwtService.clearTokens();
      return null;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const res = await axios.post<AuthResponse>(
          `${this.baseUrl}/auth/refresh`,
          { refreshToken }
        );
        const data = res.data;
        const nextToken = data.accessToken ?? data.token;
        jwtService.setTokens(nextToken, data.refreshToken);
        return nextToken;
      } catch {
        jwtService.clearTokens();
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request<T>(
    path: string,
    options: RequestInit = {},
    token?: string | null
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (options.headers) {
      new Headers(options.headers).forEach((value, key) => {
        headers[key] = value;
      });
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let data: unknown = options.body;
    if (typeof options.body === 'string') {
      try {
        data = JSON.parse(options.body);
      } catch {
        data = options.body;
      }
    }

    const res = await this.client.request<T>({
      url: path,
      method: options.method || 'GET',
      data,
      headers,
    });
    return res.data;
  }
}

class ProductApi {
  constructor(private readonly http: HttpClient) {}

  getProducts(params?: Record<string, string | number | boolean | undefined>) {
    const sp = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '' && v !== 'ALL') {
          sp.set(k, String(v));
        }
      }
    }
    const qs = sp.toString();
    return this.http.request<{ products: Product[]; total: number; source?: string }>(
      `/products${qs ? `?${qs}` : ''}`
    );
  }

  getProductById(id: string) {
    return this.http.request<{ product: Product }>(
      `/products/${encodeURIComponent(id)}`
    );
  }

  getProductPairings(id: string, limit = 3) {
    return this.http.request<{ pairings: Product[]; total: number }>(
      `/products/${encodeURIComponent(id)}/pairings?limit=${limit}`
    );
  }
}

class BuildApi {
  constructor(private readonly http: HttpClient) {}

  getPresets() {
    return this.http.request<{ presets: PresetBuild[] }>('/builds/presets');
  }

  validateBuild(slots: Partial<Record<ComponentCategory, string>>) {
    return this.http.request<{ validation: BuildValidationResult }>(
      '/builds/validate',
      {
        method: 'POST',
        body: JSON.stringify({ slots }),
      }
    );
  }

  evaluateCandidates(payload: {
    category: ComponentCategory;
    slots?: Partial<Record<ComponentCategory, string>>;
    search?: string;
    strictOnly?: boolean;
  }) {
    return this.http.request<{
      candidates: BuildCandidateEvaluation[];
      total: number;
    }>('/builds/candidates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

class AuthApi {
  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  register(name: string, email: string, password: string) {
    return this.http.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  }

  demoLogin(role: 'admin' | 'customer') {
    return this.http.request<AuthResponse>('/auth/demo', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }

  refresh(refreshToken: string) {
    return this.http.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  logoutSession(refreshToken?: string | null, token?: string | null) {
    return this.http.request<{ ok: boolean }>(
      '/auth/logout',
      {
        method: 'POST',
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      },
      token
    );
  }

  verifyToken(token?: string | null) {
    return this.http.request<{
      valid: boolean;
      user: User;
      claims: DecodedJwtPayload | null;
    }>('/auth/verify', {}, token);
  }

  getGoogleConfig(state = 'storefront') {
    return this.http.request<GoogleOAuthConfig>(
      `/auth/google/config?state=${encodeURIComponent(state)}`
    );
  }

  loginWithGoogle(payload: {
    idToken?: string;
    accessToken?: string;
    code?: string;
    redirectUri?: string;
  }) {
    return this.http.request<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  getMe(token?: string | null) {
    return this.http.request<{ user: User }>('/auth/me', {}, token);
  }
}

class OrderApi {
  constructor(private readonly http: HttpClient) {}

  previewQuote(
    items: Array<{ productId: string; quantity: number }>,
    couponCode?: string
  ) {
    return this.http.request<{ quote: PriceQuote }>('/orders/quote', {
      method: 'POST',
      body: JSON.stringify({ items, couponCode }),
    });
  }

  createOrder(
    payload: {
      items: Array<{ productId: string; quantity: number }>;
      shippingAddress: ShippingAddress;
      paymentMethod: PaymentMethod;
      couponCode?: string;
      customerEmail?: string;
    },
    token?: string | null
  ) {
    return this.http.request<{ order: Order }>(
      '/orders',
      { method: 'POST', body: JSON.stringify(payload) },
      token
    );
  }

  getMyOrders(token: string) {
    return this.http.request<{ orders: Order[] }>('/orders/my', {}, token);
  }
}

class CouponApi {
  constructor(private readonly http: HttpClient) {}

  getActiveCoupons() {
    return this.http.request<{ coupons: Coupon[] }>('/coupons/active');
  }

  validateCoupon(subtotal: number, code: string) {
    return this.http.request<{ coupon: Coupon; discount: number }>(
      '/coupons/validate',
      {
        method: 'POST',
        body: JSON.stringify({ subtotal, code }),
      }
    );
  }
}

class MediaApi {
  constructor(private readonly http: HttpClient) {}

  getStudioSonglongSets() {
    return this.http.request<{
      sets: StudioSonglongSet[];
      totalSets: number;
      totalImages: number;
    }>('/media/studio-songlong');
  }
}

class ReviewApi {
  constructor(private readonly http: HttpClient) {}

  getProductReviews(
    productId: string,
    params?: { sort?: ReviewSortOption; rating?: number }
  ) {
    const sp = new URLSearchParams();
    if (params?.sort) sp.set('sort', params.sort);
    if (params?.rating !== undefined) sp.set('rating', String(params.rating));
    const qs = sp.toString();
    return this.http.request<{
      productId: string;
      reviews: Review[];
      summary: ReviewSummary;
    }>(`/reviews/product/${encodeURIComponent(productId)}${qs ? `?${qs}` : ''}`);
  }

  createReview(
    productId: string,
    payload: { rating: number; comment: string },
    token: string
  ) {
    return this.http.request<{ review: Review; summary: ReviewSummary }>(
      `/reviews/product/${encodeURIComponent(productId)}`,
      { method: 'POST', body: JSON.stringify(payload) },
      token
    );
  }

  updateReview(
    reviewId: string,
    payload: { rating?: number; comment?: string },
    token: string
  ) {
    return this.http.request<{ review: Review; summary: ReviewSummary }>(
      `/reviews/${encodeURIComponent(reviewId)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      token
    );
  }

  deleteReview(reviewId: string, token: string) {
    return this.http.request<{ ok: boolean; summary: ReviewSummary }>(
      `/reviews/${encodeURIComponent(reviewId)}`,
      { method: 'DELETE' },
      token
    );
  }

  addReply(reviewId: string, content: string, token: string) {
    return this.http.request<{ review: Review; reply: ReviewReply }>(
      `/reviews/${encodeURIComponent(reviewId)}/replies`,
      { method: 'POST', body: JSON.stringify({ content }) },
      token
    );
  }

  deleteReply(reviewId: string, replyId: string, token: string) {
    return this.http.request<{ review: Review }>(
      `/reviews/${encodeURIComponent(reviewId)}/replies/${encodeURIComponent(replyId)}`,
      { method: 'DELETE' },
      token
    );
  }
}

class PaymentApi {
  constructor(private readonly http: HttpClient) {}

  createVnpayUrl(
    payload: { orderId: string; bankCode?: string; locale?: 'vn' | 'en' },
    token?: string | null
  ) {
    return this.http.request<{
      paymentUrl: string;
      txnRef: string;
      order: Order;
    }>(
      '/payment/vnpay/create-url',
      { method: 'POST', body: JSON.stringify(payload) },
      token
    );
  }

  verifyVnpayReturn(queryString: string) {
    const cleanQs = queryString.startsWith('?')
      ? queryString.slice(1)
      : queryString;
    return this.http.request<{
      result: VnpayVerifyResult;
      order: Order | null;
    }>(`/payment/vnpay/verify${cleanQs ? `?${cleanQs}` : ''}`);
  }

  completeVnpaySandbox(
    payload: { orderId: string; bankCode?: string; responseCode?: string },
    token?: string | null
  ) {
    return this.http.request<{
      result: VnpayVerifyResult;
      order: Order;
    }>(
      '/payment/vnpay/sandbox-complete',
      { method: 'POST', body: JSON.stringify(payload) },
      token
    );
  }
}

const httpClient = new HttpClient(ENV.API_BASE_URL);
const productApi = new ProductApi(httpClient);
const buildApi = new BuildApi(httpClient);
const authApi = new AuthApi(httpClient);
const orderApi = new OrderApi(httpClient);
const couponApi = new CouponApi(httpClient);
const mediaApi = new MediaApi(httpClient);
const reviewApi = new ReviewApi(httpClient);
const paymentApi = new PaymentApi(httpClient);

export const api = {
  axiosInstance: httpClient.client,

  getHealth: () =>
    httpClient.request<{
      status: string;
      dbMode: 'mongodb' | 'disconnected';
      productCount: number;
    }>('/health'),

  getProducts: productApi.getProducts.bind(productApi),
  getProductById: productApi.getProductById.bind(productApi),
  getProductPairings: productApi.getProductPairings.bind(productApi),

  getStudioSonglongSets: mediaApi.getStudioSonglongSets.bind(mediaApi),

  getPresets: buildApi.getPresets.bind(buildApi),
  validateBuild: buildApi.validateBuild.bind(buildApi),
  evaluateBuildCandidates: buildApi.evaluateCandidates.bind(buildApi),

  login: authApi.login.bind(authApi),
  register: authApi.register.bind(authApi),
  demoLogin: authApi.demoLogin.bind(authApi),
  refreshAuth: authApi.refresh.bind(authApi),
  logoutSession: authApi.logoutSession.bind(authApi),
  verifyToken: authApi.verifyToken.bind(authApi),
  getGoogleOAuthConfig: authApi.getGoogleConfig.bind(authApi),
  loginWithGoogle: authApi.loginWithGoogle.bind(authApi),
  getMe: authApi.getMe.bind(authApi),

  previewOrderQuote: orderApi.previewQuote.bind(orderApi),
  createOrder: orderApi.createOrder.bind(orderApi),
  getMyOrders: orderApi.getMyOrders.bind(orderApi),

  getActiveCoupons: couponApi.getActiveCoupons.bind(couponApi),
  validateCoupon: couponApi.validateCoupon.bind(couponApi),

  getProductReviews: reviewApi.getProductReviews.bind(reviewApi),
  createReview: reviewApi.createReview.bind(reviewApi),
  updateReview: reviewApi.updateReview.bind(reviewApi),
  deleteReview: reviewApi.deleteReview.bind(reviewApi),
  addReviewReply: reviewApi.addReply.bind(reviewApi),
  deleteReviewReply: reviewApi.deleteReply.bind(reviewApi),

  createVnpayUrl: paymentApi.createVnpayUrl.bind(paymentApi),
  verifyVnpayReturn: paymentApi.verifyVnpayReturn.bind(paymentApi),
  completeVnpaySandbox: paymentApi.completeVnpaySandbox.bind(paymentApi),
};
