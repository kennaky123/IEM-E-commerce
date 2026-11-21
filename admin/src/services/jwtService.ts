import { User } from '../types';

export interface AdminDecodedJwtPayload {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin';
  tokenType?: 'access' | 'refresh';
  jti?: string;
  iat?: number;
  exp?: number;
  iss?: string;
}

const ADMIN_TOKEN_KEY = 'tailadmin_token';
const ADMIN_REFRESH_TOKEN_KEY = 'tailadmin_refresh_token';
const ADMIN_USER_KEY = 'tailadmin_user';

class AdminJwtService {
  getAccessToken(): string | null {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY);
  }

  getStoredUser(): User | null {
    const saved = localStorage.getItem(ADMIN_USER_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved) as User;
    } catch {
      return null;
    }
  }

  setSession(token: string, user: User, refreshToken?: string | null): void {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
    if (refreshToken) {
      localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  clearSession(): void {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  }

  decode(token?: string | null): AdminDecodedJwtPayload | null {
    const target = token ?? this.getAccessToken();
    if (!target) return null;

    const parts = target.split('.');
    if (parts.length !== 3) return null;

    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      const json = new TextDecoder().decode(bytes);
      return JSON.parse(json) as AdminDecodedJwtPayload;
    } catch {
      return null;
    }
  }

  isExpired(token?: string | null, bufferSeconds = 15): boolean {
    const payload = this.decode(token);
    if (!payload?.exp) return false;
    return Date.now() >= (payload.exp - bufferSeconds) * 1000;
  }

  getAuthorizationHeader(): string | null {
    const token = this.getAccessToken();
    return token ? `Bearer ${token}` : null;
  }
}

export const adminJwtService = new AdminJwtService();
export { AdminJwtService };
