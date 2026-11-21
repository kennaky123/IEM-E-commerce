import { Response } from 'express';
import { AppConfig } from '../config/AppConfig';
import { UnauthorizedError } from '../errors/AppError';
import { AuthRequest } from '../middleware/AuthMiddleware';
import { AuthService } from '../services/AuthService';
import { UserRole } from '../types';
import { BaseController } from './BaseController';

export class AuthController extends BaseController {
  constructor(
    private readonly authService: AuthService,
    private readonly config?: AppConfig
  ) {
    super();
  }

  register = this.handle(async (req, res: Response) => {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };
    const result = await this.authService.register({ name, email, password });
    res.status(201).json(result);
  });

  login = this.handle(async (req, res: Response) => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };
    const result = await this.authService.login({ email, password });
    res.json(result);
  });

  demo = this.handle(async (req, res: Response) => {
    const { role } = req.body as { role?: 'admin' | 'customer' };
    const result = await this.authService.demoLogin(role);
    res.json(result);
  });

  refresh = this.handle(async (req, res: Response) => {
    const body = (req.body ?? {}) as { refreshToken?: string };
    const result = await this.authService.refreshSession(body.refreshToken);
    res.json(result);
  });

  logout = this.handle<AuthRequest>(async (req, res: Response) => {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;
    const body = (req.body ?? {}) as { refreshToken?: string };
    const result = this.authService.logout(accessToken, body.refreshToken);
    res.json(result);
  });

  verify = this.handle<AuthRequest>(async (req, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      throw new UnauthorizedError('Authentication token required.');
    }
    const result = await this.authService.verifySession(token);
    res.json(result);
  });

  googleConfig = this.handle(async (req, res: Response) => {
    const state =
      typeof req.query.state === 'string' ? req.query.state : undefined;
    const config = this.authService.getGoogleOAuthConfig(state);
    res.json(config);
  });

  googleLogin = this.handle(async (req, res: Response) => {
    const body = (req.body ?? {}) as {
      idToken?: string;
      accessToken?: string;
      code?: string;
      redirectUri?: string;
    };
    const result = await this.authService.authenticateWithGoogle(body);
    res.json(result);
  });

  googleCallback = this.handle(async (req, res: Response) => {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state =
      typeof req.query.state === 'string' ? req.query.state : 'storefront';
    const session = await this.authService.authenticateWithGoogle({ code });
    const targetBase =
      state === 'admin'
        ? this.config?.adminPortalUrl || 'http://localhost:5174'
        : this.config?.storefrontUrl || 'http://localhost:5173';

    res.redirect(
      `${targetBase}/?oauth_token=${encodeURIComponent(
        session.accessToken
      )}&oauth_refresh=${encodeURIComponent(session.refreshToken)}`
    );
  });

  me = this.handle<AuthRequest>(async (req, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Unauthorized');
    }
    const user = await this.authService.getProfile(req.user.id);
    res.json({ user });
  });

  listUsers = this.handle<AuthRequest>(async (_req, res: Response) => {
    const users = await this.authService.listUsers();
    res.json({ users });
  });

  updateUserRole = this.handle<AuthRequest>(async (req, res: Response) => {
    const { role } = req.body as { role?: UserRole };
    const updated = await this.authService.updateUserRole(
      String(req.params.id),
      role as UserRole,
      req.user?.id
    );
    res.json({ user: updated });
  });
}
