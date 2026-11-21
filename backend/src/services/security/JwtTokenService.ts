import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { AppConfig } from '../../config/AppConfig';
import { AppError, UnauthorizedError } from '../../errors/AppError';
import {
  ITokenService,
  JwtTokenClaims,
  JwtTokenPair,
} from '../../interfaces/services';
import { SafeUser } from '../../types';

export class JwtTokenService implements ITokenService {
  private readonly revokedJtis = new Map<string, number>();

  constructor(private readonly config: AppConfig) {}

  private pruneExpiredRevocations(): void {
    const now = Date.now();
    for (const [jti, expiresAtMs] of this.revokedJtis.entries()) {
      if (expiresAtMs <= now) {
        this.revokedJtis.delete(jti);
      }
    }
  }

  sign(user: SafeUser): string {
    const jti = crypto.randomUUID();
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        tokenType: 'access',
        jti,
      },
      this.config.jwtSecret,
      {
        expiresIn: this.config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
        issuer: this.config.jwtIssuer,
      }
    );
  }

  signRefreshToken(user: SafeUser): string {
    const jti = crypto.randomUUID();
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        tokenType: 'refresh',
        jti,
      },
      this.config.jwtRefreshSecret,
      {
        expiresIn: this.config
          .jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'],
        issuer: this.config.jwtIssuer,
      }
    );
  }

  signTokenPair(user: SafeUser): JwtTokenPair {
    const accessToken = this.sign(user);
    const refreshToken = this.signRefreshToken(user);
    const decoded = this.decode(accessToken);
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 7 * 86_400_000).toISOString();

    return {
      token: accessToken,
      accessToken,
      refreshToken,
      expiresIn: this.config.jwtExpiresIn,
      expiresAt,
    };
  }

  verify(token: string): SafeUser {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret, {
        issuer: this.config.jwtIssuer,
      }) as JwtTokenClaims;

      if (decoded.tokenType && decoded.tokenType !== 'access') {
        throw new UnauthorizedError('Invalid token type.');
      }
      if (decoded.jti && this.isRevoked(decoded.jti)) {
        throw new UnauthorizedError('Token has been revoked.');
      }

      return {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
        createdAt: decoded.createdAt || '',
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new UnauthorizedError('Invalid or expired authentication token.');
    }
  }

  verifyRefreshToken(token: string): JwtTokenClaims {
    try {
      const decoded = jwt.verify(token, this.config.jwtRefreshSecret, {
        issuer: this.config.jwtIssuer,
      }) as JwtTokenClaims;

      if (decoded.tokenType !== 'refresh') {
        throw new UnauthorizedError('Invalid refresh token type.');
      }
      if (decoded.jti && this.isRevoked(decoded.jti)) {
        throw new UnauthorizedError('Refresh token has been revoked.');
      }

      return decoded;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }
  }

  decode(token: string): JwtTokenClaims | null {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded === 'string') return null;
    return decoded as JwtTokenClaims;
  }

  revoke(token: string): void {
    const decoded = this.decode(token);
    if (!decoded?.jti) return;
    const expiresAtMs = decoded.exp
      ? decoded.exp * 1000
      : Date.now() + 30 * 86_400_000;
    this.revokedJtis.set(decoded.jti, expiresAtMs);
  }

  isRevoked(jti: string): boolean {
    this.pruneExpiredRevocations();
    return this.revokedJtis.has(jti);
  }
}
