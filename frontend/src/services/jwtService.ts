export interface DecodedJwtPayload {
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

const ACCESS_TOKEN_KEY = 'moondrop_sl_token';
const REFRESH_TOKEN_KEY = 'moondrop_sl_refresh_token';

class JwtService {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken?: string | null): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  decode(token?: string | null): DecodedJwtPayload | null {
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
      return JSON.parse(json) as DecodedJwtPayload;
    } catch {
      return null;
    }
  }

  isExpired(token?: string | null, bufferSeconds = 15): boolean {
    const payload = this.decode(token);
    if (!payload?.exp) return false;
    return Date.now() >= (payload.exp - bufferSeconds) * 1000;
  }

  getRemainingMs(token?: string | null): number {
    const payload = this.decode(token);
    if (!payload?.exp) return 0;
    return Math.max(0, payload.exp * 1000 - Date.now());
  }

  getAuthorizationHeader(tokenOverride?: string | null): string | null {
    const token = tokenOverride ?? this.getAccessToken();
    return token ? `Bearer ${token}` : null;
  }
}

export const jwtService = new JwtService();
export { JwtService };
