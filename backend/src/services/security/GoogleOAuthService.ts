import { AppConfig } from '../../config/AppConfig';
import { BadRequestError, UnauthorizedError } from '../../errors/AppError';
import {
  GoogleOAuthConfigInfo,
  GoogleUserProfile,
  IGoogleOAuthService,
} from '../../interfaces/services';

interface GoogleTokenInfoPayload {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: string | boolean;
  aud?: string;
}

interface GoogleUserInfoPayload {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

interface GoogleTokenExchangePayload {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

export class GoogleOAuthService implements IGoogleOAuthService {
  constructor(private readonly config: AppConfig) {}

  getAuthorizationUrl(options?: {
    state?: string;
    redirectUri?: string;
  }): string {
    const params = new URLSearchParams({
      client_id: this.config.googleClientId,
      redirect_uri: options?.redirectUri || this.config.googleRedirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state: options?.state || 'storefront',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  getConfigInfo(state = 'storefront'): GoogleOAuthConfigInfo {
    return {
      enabled: Boolean(this.config.googleClientId),
      clientId: this.config.googleClientId || null,
      redirectUri: this.config.googleRedirectUri,
      authUrl: this.getAuthorizationUrl({ state }),
    };
  }

  async verifyIdToken(idToken: string): Promise<GoogleUserProfile> {
    const cleanToken = idToken?.trim();
    if (!cleanToken) {
      throw new UnauthorizedError('Google ID token is required.');
    }

    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(cleanToken)}`
    );
    if (!res.ok) {
      throw new UnauthorizedError('Invalid or expired Google ID token.');
    }

    const data = (await res.json()) as GoogleTokenInfoPayload;
    if (
      this.config.googleClientId &&
      data.aud &&
      data.aud !== this.config.googleClientId
    ) {
      throw new UnauthorizedError('Google ID token audience mismatch.');
    }

    if (!data.sub || !data.email) {
      throw new UnauthorizedError(
        'Google token is missing required user profile claims.'
      );
    }

    return {
      googleId: data.sub,
      email: data.email.toLowerCase(),
      name: data.name || data.email.split('@')[0],
      avatar: data.picture,
      emailVerified:
        data.email_verified === true || data.email_verified === 'true',
    };
  }

  async verifyAccessToken(accessToken: string): Promise<GoogleUserProfile> {
    const cleanToken = accessToken?.trim();
    if (!cleanToken) {
      throw new UnauthorizedError('Google OAuth2 access token is required.');
    }

    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${cleanToken}` },
    });
    if (!res.ok) {
      throw new UnauthorizedError(
        'Invalid or expired Google OAuth2 access token.'
      );
    }

    const data = (await res.json()) as GoogleUserInfoPayload;
    if (!data.sub || !data.email) {
      throw new UnauthorizedError(
        'Google userinfo response is missing required profile fields.'
      );
    }

    return {
      googleId: data.sub,
      email: data.email.toLowerCase(),
      name: data.name || data.email.split('@')[0],
      avatar: data.picture,
      emailVerified: Boolean(data.email_verified),
    };
  }

  async exchangeCodeForProfile(
    code: string,
    redirectUri?: string
  ): Promise<GoogleUserProfile> {
    const cleanCode = code?.trim();
    if (!cleanCode) {
      throw new BadRequestError('Google authorization code is required.');
    }

    if (!this.config.googleClientId || !this.config.googleClientSecret) {
      throw new BadRequestError(
        'Google OAuth2 client credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are not configured on the server.'
      );
    }

    const body = new URLSearchParams({
      code: cleanCode,
      client_id: this.config.googleClientId,
      client_secret: this.config.googleClientSecret,
      redirect_uri: redirectUri || this.config.googleRedirectUri,
      grant_type: 'authorization_code',
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new UnauthorizedError(
        'Failed to exchange Google OAuth2 authorization code.'
      );
    }

    const tokens = (await res.json()) as GoogleTokenExchangePayload;
    if (tokens.access_token) {
      return this.verifyAccessToken(tokens.access_token);
    }
    if (tokens.id_token) {
      return this.verifyIdToken(tokens.id_token);
    }

    throw new UnauthorizedError(
      'Google token endpoint returned neither access_token nor id_token.'
    );
  }
}
