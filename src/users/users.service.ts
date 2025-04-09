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

  /**
   * Registers a new user with the provided input data.
   *
   * @param input - The input data for creating a new user.
   * @returns A promise that resolves to the created user.
   *
   * @throws ConflictException - If the email provided already exists in the database.
   * @throws UnprocessableEntityException - If the user creation fails.
   */
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

  /**
   * Logs in a user with the provided input data.
   *
   * @param input - The input data for logging in a user.
   * @returns A promise that resolves to an AuthResponse object containing the access token.
   *
   * @throws UnauthorizedException - If the credentials are invalid.
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user || !(await compareHashedField(input.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signToken(user.id, user.email);
  }

  /**
   * Logs in a user using biometric authentication.
   *
   * @param biometricKey - The biometric key for authentication.
   * @returns A promise that resolves to an AuthResponse object containing the access token.
   *
   * @throws UnauthorizedException - If the biometric login fails.
   */
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

  /**
   * Enables biometric login for a user.
   *
   * @param userId - The ID of the user.
   * @param input - The input data for enabling biometric login.
   * @returns A promise that resolves to the updated user.
   *
   * @throws ConflictException - If the biometric key is already in use.
   * @throws UnprocessableEntityException - If enabling biometric login fails.
   */
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

  /**
   * Retrieves the user by ID.
   *
   * @param userId - The ID of the user.
   * @returns A promise that resolves to the user.
   *
   * @throws NotFoundException - If the user is not found.
   */
  async findById(userId: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Signs a JWT token with the provided user ID and email.
   *
   * @param userId - The ID of the user.
   * @param email - The email of the user.
   * @returns An object containing the access token.
   */
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
