import { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';
import { ITokenService } from '../interfaces/services';
import { SafeUser } from '../types';

export interface AuthRequest extends Request {
  user?: SafeUser;
}

export class AuthMiddleware {
  constructor(private readonly tokenService: ITokenService) {}

  optionalAuth = (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const token = header.slice(7);
      try {
        req.user = this.tokenService.verify(token);
      } catch {
        // Ignore invalid optional tokens
      }
    }
    next();
  };

  requireAuth = (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      next(new UnauthorizedError('Authentication token required.'));
      return;
    }

    const token = header.slice(7);
    try {
      req.user = this.tokenService.verify(token);
      next();
    } catch {
      next(new UnauthorizedError('Invalid or expired authentication token.'));
    }
  };

  requireAdmin = (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required.'));
      return;
    }
    if (req.user.role !== 'admin') {
      next(new ForbiddenError('Administrator privileges required.'));
      return;
    }
    next();
  };
}
