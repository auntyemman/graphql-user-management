import { Test, TestingModule } from '@nestjs/testing';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';
import {
  RegisterInput,
  LoginInput,
  BiometricLoginInput,
} from './dto/create-user.input';
import { EnableBiometricLoginInput } from './dto/update-user.input';
import { User } from './entities/user.entity';
import { AuthResponse } from './dto/auth-response';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { Reflector } from '@nestjs/core';

describe('UsersResolver', () => {
  let resolver: UsersResolver;
  let usersService: jest.Mocked<UsersService>;

  // Mock data
  const mockUser: User = {
    id: 'ajjwe1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    biometricKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthResponse: AuthResponse = {
    accessToken: 'jwt-token',
  };

  beforeEach(async () => {
    // Create mock service with all the methods used by the resolver
    const mockUsersService = {
      register: jest.fn(),
      login: jest.fn(),
      biometricLogin: jest.fn(),
      getProfile: jest.fn(),
      enableBiometric: jest.fn(),
    };

    // Mock JWT service
    const mockJwtService = {
      sign: jest.fn(() => 'mocked-jwt-token'),
      verify: jest.fn(),
    };

    // Create testing module with all required providers
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersResolver,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(() => true), // Mock to bypass @Public() decorator check
          },
        },
        JwtAuthGuard, // Add the guard itself
      ],
    })
      .overrideGuard(JwtAuthGuard) // Override the guard to avoid actual JWT validation
      .useValue({
        canActivate: jest.fn(() => true), // Always allow access in tests
      })
      .compile();

    resolver = module.get<UsersResolver>(UsersResolver);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerInput: RegisterInput = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      usersService.register.mockResolvedValue(mockUser);

      const result = await resolver.register(registerInput);

      expect(usersService.register).toHaveBeenCalledWith(registerInput);
      expect(result).toEqual(mockUser);
    });
  });

  describe('login', () => {
    it('should login a user and return auth response', async () => {
      const loginInput: LoginInput = {
        email: 'test@example.com',
        password: 'password123',
      };

      usersService.login.mockResolvedValue(mockAuthResponse);

      const result = await resolver.login(loginInput);

      expect(usersService.login).toHaveBeenCalledWith(loginInput);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('biometricLogin', () => {
    it('should login a user with biometric key and return auth response', async () => {
      const biometricInput: BiometricLoginInput = {
        biometricKey: 'biometric-key-123',
      };

      usersService.biometricLogin.mockResolvedValue(mockAuthResponse);

      const result = await resolver.biometricLogin(biometricInput);

      expect(usersService.biometricLogin).toHaveBeenCalledWith(
        biometricInput.biometricKey,
      );
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('enableBiometric', () => {
    it('should enable biometric login for a user', async () => {
      const enableBiometricInput: EnableBiometricLoginInput = {
        biometricKey: 'new-biometric-key',
      };

      const updatedUser = {
        ...mockUser,
        biometricKey: 'new-biometric-key',
      };

      usersService.enableBiometric.mockResolvedValue(updatedUser);

      const result = await resolver.enableBiometric(
        enableBiometricInput,
        mockUser,
      );

      expect(usersService.enableBiometric).toHaveBeenCalledWith(
        mockUser.id,
        enableBiometricInput,
      );
      expect(result).toEqual(updatedUser);
    });
  });
});