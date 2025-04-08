import { Test, TestingModule } from '@nestjs/testing';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import {
  RegisterInput,
  LoginInput,
  BiometricLoginInput,
} from './dto/create-user.input';
import { AuthResponse } from './dto/auth-response';
import { EnableBiometricLoginInput } from './dto/update-user.input';

describe('UsersResolver', () => {
  let resolver: UsersResolver;
  let usersService: jest.Mocked<UsersService>;

  // Mock user data
  const mockUser: User = {
    id: 'user-id-1',
    email: 'test@example.com',
    password: 'hashed-password',
    name: 'John Doe',
    biometricKey: null,
    biometricKeyFingerprint: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock auth response
  const mockAuthResponse: AuthResponse = {
    accessToken: 'mock-jwt-token',
  };

  beforeEach(async () => {
    // Create mock for UsersService
    const usersServiceMock = {
      register: jest.fn(),
      login: jest.fn(),
      biometricLogin: jest.fn(),
      getProfile: jest.fn(),
      enableBiometric: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersResolver,
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    }).compile();

    resolver = module.get<UsersResolver>(UsersResolver);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      // Arrange
      const registerInput: RegisterInput = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };
      usersService.register.mockResolvedValue(mockUser);

      // Act
      const result = await resolver.register(registerInput);

      // Assert
      expect(usersService.register).toHaveBeenCalledWith(registerInput);
      expect(result).toEqual(mockUser);
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      // Arrange
      const loginInput: LoginInput = {
        email: 'test@example.com',
        password: 'password123',
      };
      usersService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await resolver.login(loginInput);

      // Assert
      expect(usersService.login).toHaveBeenCalledWith(loginInput);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('biometricLogin', () => {
    it('should perform biometric login', async () => {
      // Arrange
      const biometricInput: BiometricLoginInput = {
        biometricKey: 'biometric-key-123',
      };
      usersService.biometricLogin.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await resolver.biometricLogin(biometricInput);

      // Assert
      expect(usersService.biometricLogin).toHaveBeenCalledWith(
        biometricInput.biometricKey,
      );
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('me', () => {
    it('should return the current user profile', async () => {
      // Arrange
      usersService.getProfile.mockResolvedValue(mockUser);

      // Act
      const result = await resolver.me(mockUser);

      // Assert
      expect(usersService.getProfile).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });
  });

  describe('enableBiometric', () => {
    it('should enable biometric login for user', async () => {
      // Arrange
      const enableBiometricInput: EnableBiometricLoginInput = {
        biometricKey: 'biometric-key-123',
      };
      const updatedUser = {
        ...mockUser,
        biometricKey: 'encrypted-biometric-key',
        biometricKeyFingerprint: 'fingerprint-hash',
      };
      usersService.enableBiometric.mockResolvedValue(updatedUser);

      // Act
      const result = await resolver.enableBiometric(
        enableBiometricInput,
        mockUser,
      );

      // Assert
      expect(usersService.enableBiometric).toHaveBeenCalledWith(
        mockUser.id,
        enableBiometricInput,
      );
      expect(result).toEqual(updatedUser);
    });
  });
});