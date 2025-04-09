import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { decrypt, encrypt, hmacFingerprint } from '../common/utils/encryption';
import { compareHashedField, hashField } from '../common/utils/hashing';
import { AuthResponse } from './dto/auth-response';
import { LoginInput, RegisterInput } from './dto/create-user.input';
import { jwtPayload } from './dto/jwt';
import { EnableBiometricLoginInput } from './dto/update-user.input';
import { User } from './entities/user.entity';
import { UserRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  // Register a new user
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

  // Login with email and password
  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user || !(await compareHashedField(input.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signToken(user.id, user.email);
  }

  // Login with biometric key
  async biometricLogin(biometricKey: string): Promise<AuthResponse> {
    const fingerprint = hmacFingerprint(biometricKey);
    const user = await this.userRepo.findByFingerprint(fingerprint);

    if (!user || !user.biometricKey) {
      throw new UnauthorizedException('Biometric login failed');
    }

    const decrypted = decrypt(user.biometricKey);
    if (decrypted !== biometricKey) {
      throw new UnauthorizedException('Biometric mismatch');
    }

    return this.signToken(user.id, user.email);
  }

  // Enable biometric login
  async enableBiometric(
    userId: string,
    input: EnableBiometricLoginInput,
  ): Promise<User> {
    const encryptedKey = encrypt(input.biometricKey);
    const fingerprint = hmacFingerprint(input.biometricKey);

    const existing = await this.userRepo.findByFingerprint(fingerprint);
    if (existing) {
      throw new ConflictException('Biometric key already in use');
    }

    const updatedUser = await this.userRepo.updateOne(userId, {
      biometricKey: encryptedKey,
      biometricKeyFingerprint: fingerprint,
    });

    if (!updatedUser) {
      throw new UnprocessableEntityException(
        'Failed to enable biometric login',
      );
    }

    return updatedUser;
  }

  // Get a user by id
  async findById(userId: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Sign token with user data
  private signToken(userId: string, email: string) {
    const payload: jwtPayload = {
      sub: userId,
      email: email,
    };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
