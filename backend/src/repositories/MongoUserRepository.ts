import { IUserRepository } from '../interfaces/repositories';
import { UserModel } from '../models/User';
import { SafeUser, User, UserRole } from '../types';
import { BaseMongoRepository } from './BaseMongoRepository';

export class MongoUserRepository
  extends BaseMongoRepository<User>
  implements IUserRepository
{
  private toSafeUser(user: User): SafeUser {
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

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    const doc = await UserModel.findOne({ email: normalized }).lean();
    return this.stripDoc<User>(doc);
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const doc = await UserModel.findOne({ googleId: googleId.trim() }).lean();
    return this.stripDoc<User>(doc);
  }

  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findOne({ id }).lean();
    return this.stripDoc<User>(doc);
  }

  async findFirstByRole(role: UserRole): Promise<User | null> {
    const doc = await UserModel.findOne({ role }).sort({ createdAt: 1 }).lean();
    return this.stripDoc<User>(doc);
  }

  async findAll(): Promise<SafeUser[]> {
    const docs = await UserModel.find({}).sort({ createdAt: 1 }).lean();
    return this.stripDocs<User>(docs).map((u) => this.toSafeUser(u));
  }

  async countByRole(role: UserRole): Promise<number> {
    return UserModel.countDocuments({ role });
  }

  async create(user: User): Promise<User> {
    await UserModel.create(user);
    return user;
  }

  async linkGoogleAccount(
    userId: string,
    googleId: string,
    avatar?: string
  ): Promise<User | null> {
    const update: Record<string, unknown> = {
      googleId,
      authProvider: 'google',
    };
    if (avatar) {
      update.avatar = avatar;
    }
    const doc = await UserModel.findOneAndUpdate(
      { id: userId },
      { $set: update },
      { new: true }
    ).lean();
    return this.stripDoc<User>(doc);
  }

  async updateRole(id: string, role: UserRole): Promise<SafeUser | null> {
    const doc = await UserModel.findOneAndUpdate(
      { id },
      { $set: { role } },
      { new: true }
    ).lean();
    const user = this.stripDoc<User>(doc);
    return user ? this.toSafeUser(user) : null;
  }

  async deleteById(id: string): Promise<boolean> {
    const res = await UserModel.deleteOne({ id });
    return res.deletedCount > 0;
  }
}
