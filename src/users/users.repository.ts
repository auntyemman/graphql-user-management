import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterInput } from './dto/create-user.input';
import { User } from './entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: RegisterInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findByEmail(email: string): Promise<User> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByBiometricKey(biometricKey: string): Promise<User> {
    return this.prisma.user.findUnique({ where: { biometricKey } });
  }

  async findByFingerprint(biometricKeyFingerprint: string): Promise<User> {
    return this.prisma.user.findUnique({ where: { biometricKeyFingerprint } });
  }

  async findById(id: string): Promise<User> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async updateOne(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }
}
