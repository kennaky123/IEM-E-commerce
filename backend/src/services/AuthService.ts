import crypto from 'node:crypto';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../errors/AppError';
import { IUserRepository } from '../interfaces/repositories';
import {
  GoogleOAuthConfigInfo,
  GoogleUserProfile,
  IGoogleOAuthService,
  IPasswordHasher,
  ITokenService,
  JwtTokenClaims,
  JwtTokenPair,
} from '../interfaces/services';
import { SafeUser, User, UserRole } from '../types';

export interface AuthSession extends JwtTokenPair {
  user: SafeUser;
}

export class AuthService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly googleOAuthService?: IGoogleOAuthService
  ) {}

  toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      authProvider: user.authProvider ?? 'local',
      googleId: user.googleId,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };
  }

  async register(input: {
    name?: string;
    email?: string;
    password?: string;
  }): Promise<AuthSession> {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const password = input.password;

    if (!name || !email || !password || password.length < 6) {
      throw new BadRequestError(
        'Name, valid email, and password (min 6 characters) are required.'
      );
    }

    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new ConflictError('An account with this email already exists.');
    }

    const user: User = {
      id: `user-${crypto.randomBytes(5).toString('hex')}`,
      name,
      email,
      passwordHash: this.passwordHasher.hash(password),
      role: 'customer',
      createdAt: new Date().toISOString(),
    };

    await this.userRepo.create(user);
    const safeUser = this.toSafeUser(user);
    return { user: safeUser, ...this.tokenService.signTokenPair(safeUser) };
  }

  async login(input: { email?: string; password?: string }): Promise<AuthSession> {
    const email = input.email?.trim();
    const password = input.password;

    if (!email || !password) {
      throw new BadRequestError('Email and password are required.');
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user || !this.passwordHasher.compare(password, user.passwordHash)) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const safeUser = this.toSafeUser(user);
    return { user: safeUser, ...this.tokenService.signTokenPair(safeUser) };
  }

  async demoLogin(role?: 'admin' | 'customer'): Promise<AuthSession> {
    const targetRole: UserRole = role === 'admin' ? 'admin' : 'customer';
    const user = await this.userRepo.findFirstByRole(targetRole);
    if (!user) {
      throw new NotFoundError(`No ${targetRole} user exists in MongoDB.`);
    }

    const safeUser = this.toSafeUser(user);
    return { user: safeUser, ...this.tokenService.signTokenPair(safeUser) };
  }

  async refreshSession(refreshToken?: string): Promise<AuthSession> {
    const rawToken = refreshToken?.trim();
    if (!rawToken) {
      throw new UnauthorizedError('Refresh token required.');
    }

    let claims: JwtTokenClaims;
    try {
      claims = this.tokenService.verifyRefreshToken(rawToken);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }

    // Rotate refresh token so the previous token cannot be replayed
    this.tokenService.revoke(rawToken);

    const user = await this.userRepo.findById(claims.id);
    if (!user) {
      throw new UnauthorizedError('User account not found.');
    }

    const safeUser = this.toSafeUser(user);
    return { user: safeUser, ...this.tokenService.signTokenPair(safeUser) };
  }

  logout(accessToken?: string, refreshToken?: string): { ok: true } {
    if (accessToken?.trim()) {
      this.tokenService.revoke(accessToken.trim());
    }
    if (refreshToken?.trim()) {
      this.tokenService.revoke(refreshToken.trim());
    }
    return { ok: true };
  }

  async verifySession(token: string): Promise<{
    valid: true;
    user: SafeUser;
    claims: JwtTokenClaims | null;
  }> {
    const verified = this.tokenService.verify(token);
    const user = await this.getProfile(verified.id);
    return {
      valid: true,
      user,
      claims: this.tokenService.decode(token),
    };
  }

  getGoogleOAuthConfig(state?: string): GoogleOAuthConfigInfo {
    if (!this.googleOAuthService) {
      throw new BadRequestError('Google OAuth2 service is not available.');
    }
    return this.googleOAuthService.getConfigInfo(state);
  }

  async authenticateGoogleProfile(
    profile: GoogleUserProfile
  ): Promise<AuthSession> {
    if (!profile.googleId || !profile.email) {
      throw new BadRequestError(
        'Google profile must include googleId and email.'
      );
    }

    let user = await this.userRepo.findByGoogleId(profile.googleId);

    if (!user) {
      const existingByEmail = await this.userRepo.findByEmail(profile.email);
      if (existingByEmail) {
        user =
          (await this.userRepo.linkGoogleAccount(
            existingByEmail.id,
            profile.googleId,
            profile.avatar
          )) ?? existingByEmail;
      }
    }

    if (!user) {
      const created: User = {
        id: `user-${crypto.randomBytes(5).toString('hex')}`,
        name: profile.name.trim() || profile.email.split('@')[0],
        email: profile.email.toLowerCase(),
        passwordHash: this.passwordHasher.hash(crypto.randomUUID()),
        role: 'customer',
        authProvider: 'google',
        googleId: profile.googleId,
        avatar: profile.avatar,
        createdAt: new Date().toISOString(),
      };
      user = await this.userRepo.create(created);
    }

    const safeUser = this.toSafeUser(user);
    return { user: safeUser, ...this.tokenService.signTokenPair(safeUser) };
  }

  async authenticateWithGoogle(input: {
    idToken?: string;
    accessToken?: string;
    code?: string;
    redirectUri?: string;
  }): Promise<AuthSession> {
    if (!this.googleOAuthService) {
      throw new BadRequestError('Google OAuth2 service is not available.');
    }

    let profile: GoogleUserProfile;
    if (input.idToken?.trim()) {
      profile = await this.googleOAuthService.verifyIdToken(input.idToken);
    } else if (input.accessToken?.trim()) {
      profile = await this.googleOAuthService.verifyAccessToken(
        input.accessToken
      );
    } else if (input.code?.trim()) {
      profile = await this.googleOAuthService.exchangeCodeForProfile(
        input.code,
        input.redirectUri
      );
    } else {
      throw new BadRequestError(
        'Google OAuth2 requires idToken, accessToken, or code.'
      );
    }

    return this.authenticateGoogleProfile(profile);
  }

  async getProfile(userId: string): Promise<SafeUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    return this.toSafeUser(user);
  }

  async listUsers(): Promise<SafeUser[]> {
    return this.userRepo.findAll();
  }

  async updateUserRole(
    targetUserId: string,
    nextRole: UserRole,
    actorUserId?: string
  ): Promise<SafeUser> {
    if (nextRole !== 'customer' && nextRole !== 'admin') {
      throw new BadRequestError('Role must be customer or admin.');
    }

    if (actorUserId && targetUserId === actorUserId && nextRole !== 'admin') {
      throw new ForbiddenError('Cannot demote your own active administrator account.');
    }

    const target = await this.userRepo.findById(targetUserId);
    if (!target) {
      throw new NotFoundError('User not found.');
    }

    if (target.role === 'admin' && nextRole !== 'admin') {
      const adminCount = await this.userRepo.countByRole('admin');
      if (adminCount <= 1) {
        throw new BadRequestError('Cannot demote the last remaining administrator.');
      }
    }

    const updated = await this.userRepo.updateRole(targetUserId, nextRole);
    if (!updated) {
      throw new NotFoundError('User not found.');
    }
    return updated;
  }
}
