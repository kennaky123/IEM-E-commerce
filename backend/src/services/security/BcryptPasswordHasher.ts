import bcrypt from 'bcryptjs';
import { IPasswordHasher } from '../../interfaces/services';

export class BcryptPasswordHasher implements IPasswordHasher {
  constructor(private readonly saltRounds = 10) {}

  hash(plain: string): string {
    return bcrypt.hashSync(plain, this.saltRounds);
  }

  compare(plain: string, hashed: string): boolean {
    return bcrypt.compareSync(plain, hashed);
  }
}
