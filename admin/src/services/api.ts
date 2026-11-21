import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import { ENV } from '../config/env';
import {
  DashboardStats,
  MediaImageItem,
  Order,
  OrderStatus,
  Product,
  User,
} from '../types';
import { adminJwtService } from './jwtService';

export interface AdminAuthResponse {
  token: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  user: User;
}

export interface AdminGoogleOAuthConfig {
  enabled: boolean;
  clientId: string | null;
  redirectUri: string;
  authUrl: string;
}

interface RetryableAdminAxiosConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

class AdminHttpClient {
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
        const header = adminJwtService.getAuthorizationHeader();
        if (header) {
          config.headers.Authorization = header;
        }
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (err: AxiosError<{ error?: string }>) => {
        const originalConfig = err.config as
          | RetryableAdminAxiosConfig
          | undefined;
        const status = err.response?.status;
        const url = originalConfig?.url || '';

        if (
          status === 401 &&
          originalConfig &&
          !originalConfig._retry &&
          !url.startsWith('/auth/login') &&
          !url.startsWith('/auth/refresh') &&
          !url.startsWith('/auth/demo') &&
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

        const errorMsg =
          err.response?.data?.error ||
          err.message ||
          `Request failed with status ${status ?? 'network'}`;
        return Promise.reject(new Error(errorMsg));
      }
    );
  }

  private async tryRefreshToken(): Promise<string | null> {
    const refreshToken = adminJwtService.getRefreshToken();
    if (!refreshToken) {
      adminJwtService.clearSession();
      return null;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const res = await axios.post<AdminAuthResponse>(
          `${this.baseUrl}/auth/refresh`,
          { refreshToken }
        );
        const data = res.data;
        const nextToken = data.accessToken ?? data.token;
        adminJwtService.setSession(nextToken, data.user, data.refreshToken);
        return nextToken;
      } catch {
        adminJwtService.clearSession();
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {};
    if (options.headers) {
      new Headers(options.headers).forEach((value, key) => {
        headers[key] = value;
      });
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

const http = new AdminHttpClient(ENV.API_BASE_URL);

export const adminApi = {
  axiosInstance: http.client,
  async login(email: string, password: string): Promise<AdminAuthResponse> {
    return http.request<AdminAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async demoAdminLogin(): Promise<AdminAuthResponse> {
    return http.request<AdminAuthResponse>('/auth/demo', {
      method: 'POST',
      body: JSON.stringify({ role: 'admin' }),
    });
  },

  async getGoogleConfig(state = 'admin'): Promise<AdminGoogleOAuthConfig> {
    return http.request<AdminGoogleOAuthConfig>(
      `/auth/google/config?state=${encodeURIComponent(state)}`
    );
  },

  async loginWithGoogle(payload: {
    idToken?: string;
    accessToken?: string;
    code?: string;
    redirectUri?: string;
  }): Promise<AdminAuthResponse> {
    return http.request<AdminAuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async refresh(refreshToken: string): Promise<AdminAuthResponse> {
    return http.request<AdminAuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  async logoutSession(): Promise<{ ok: boolean }> {
    const refreshToken = adminJwtService.getRefreshToken();
    return http.request<{ ok: boolean }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
  },

  async getMe(): Promise<{ user: User }> {
    return http.request<{ user: User }>('/auth/me');
  },

  async getStats(): Promise<DashboardStats> {
    const res = await http.request<{ stats: DashboardStats }>(
      '/stats/dashboard'
    );
    return res.stats;
  },

  async getHealth(): Promise<{
    status: string;
    dbMode: string;
    productCount: number;
    timestamp: string;
  }> {
    return http.request<{
      status: string;
      dbMode: string;
      productCount: number;
      timestamp: string;
    }>('/health');
  },

  async getProducts(
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<Product[]> {
    const sp = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '' && v !== 'ALL') {
          sp.set(k, String(v));
        }
      }
    }
    const qs = sp.toString();
    const res = await http.request<{ products: Product[]; total: number }>(
      `/products${qs ? `?${qs}` : ''}`
    );
    return res.products;
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const res = await http.request<{ product: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.product;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const res = await http.request<{ product: Product }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.product;
  },

  async deleteProduct(id: string): Promise<void> {
    await http.request(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  async getOrders(params?: {
    search?: string;
    status?: string;
  }): Promise<Order[]> {
    const sp = new URLSearchParams();
    if (params?.search?.trim()) sp.set('search', params.search.trim());
    if (params?.status && params.status !== 'ALL') sp.set('status', params.status);
    const qs = sp.toString();
    const res = await http.request<{ orders: Order[]; total?: number }>(
      `/orders${qs ? `?${qs}` : ''}`
    );
    return res.orders;
  },

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    const res = await http.request<{ order: Order }>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.order;
  },

  async getMediaLibrary(): Promise<MediaImageItem[]> {
    const res = await http.request<{ images: MediaImageItem[]; total: number }>(
      '/media/tainghe'
    );
    return res.images;
  },

  async uploadMedia(filename: string, dataUrl: string): Promise<MediaImageItem> {
    return http.request<MediaImageItem>('/media/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, dataUrl }),
    });
  },

  async getUsers(): Promise<User[]> {
    const res = await http.request<{ users: User[] }>('/auth/users');
    return res.users;
  },

  async updateUserRole(id: string, role: 'admin' | 'customer'): Promise<User> {
    const res = await http.request<{ user: User }>(`/auth/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    return res.user;
  },
};
