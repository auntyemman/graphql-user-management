import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LoginInput, RegisterInput } from './dto/create-user.input';
import { UserRepository } from './users.repository';
import { JwtService } from '@nestjs/jwt';
import { compareHashedField, hashField } from 'src/common/utils/hashing';
import { User } from './entities/user.entity';
import { jwtPayload } from './dto/jwt';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<User> {
    const existingUser = await this.userRepo.findByEmail(input.email);
    if (existingUser) throw new ConflictException('Email already exists');

    const hashedPassword = await hashField(input.password);
    const user = await this.userRepo.createUser({
      ...input,
      password: hashedPassword,
    });
    if (!user) throw new UnprocessableEntityException('User creation failed');
    return user;
  }

  async login(input: LoginInput) {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user || !(await compareHashedField(input.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signToken(user.id, user.email);
  }

  async biometricLogin(biometricKey: string) {
    const user = await this.userRepo.findByBiometricKey(biometricKey);
    if (!user) throw new UnauthorizedException('Biometric login failed');
    return this.signToken(user.id, user.email);
  }

  async enableBiometricLogin(biometricKey: string) {
    // TODO: Implement biometric login enabling logic
    const user = await this.userRepo.findByBiometricKey(biometricKey);
    if (user) throw new ConflictException('Biometric key already exists');
    // Enable biometric login for the user
    // This is a placeholder implementation. Replace with actual logic.
    // const hashedBiometricKey = await hashField(biometricKey);

  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findById(userId: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private signToken(userId: string, email: string) {
    const payload: jwtPayload = {
      sub: userId,
      email: email,
    };
    return {
      accessToken: this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '1d',
      }),
    };
  }

}
