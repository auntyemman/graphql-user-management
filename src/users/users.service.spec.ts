import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as encryptionUtils from '../common/utils/encryption';
import * as hashingUtils from '../common/utils/hashing';
import { LoginInput, RegisterInput } from './dto/create-user.input';
import { EnableBiometricLoginInput } from './dto/update-user.input';
import { User } from './entities/user.entity';
import { UserRepository } from './users.repository';
import { UsersService } from './users.service';

// Mock the external utilities
jest.mock('../common/utils/hashing');
jest.mock('../common/utils/encryption');

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<UserRepository>;
  let jwtService: jest.Mocked<JwtService>;

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

  const mockUserWithBiometric: User = {
    ...mockUser,
    biometricKey: 'encrypted-biometric-key',
    biometricKeyFingerprint: 'fingerprint-hash',
  };

  beforeEach(async () => {
    // Create mocks for repository and jwt service
    const userRepoMock = {
      findByEmail: jest.fn(),
      createUser: jest.fn(),
      findByFingerprint: jest.fn(),
      updateOne: jest.fn(),
      findById: jest.fn(),
    };

    const jwtServiceMock = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UserRepository, useValue: userRepoMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(UserRepository) as jest.Mocked<UserRepository>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;

    // Reset mocks for utility functions
    jest
      .spyOn(hashingUtils, 'hashField')
      .mockImplementation(async (field) => `hashed-${field}`);
    jest
      .spyOn(hashingUtils, 'compareHashedField')
      .mockImplementation(
        async (plain, hashed) => hashed === `hashed-${plain}`,
      );
    jest
      .spyOn(encryptionUtils, 'encrypt')
      .mockImplementation((value) => `encrypted-${value}`);
    jest
      .spyOn(encryptionUtils, 'decrypt')
      .mockImplementation((value) => value.replace('encrypted-', ''));
    jest
      .spyOn(encryptionUtils, 'hmacFingerprint')
      .mockImplementation((value) => `fingerprint-${value}`);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerInput: RegisterInput = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test',
    };

    it('should register a new user successfully', async () => {
      // Setup
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.createUser.mockResolvedValue(mockUser);

      // Execute
      const result = await service.register(registerInput);

      // Assert
      expect(userRepo.findByEmail).toHaveBeenCalledWith(registerInput.email);
      expect(hashingUtils.hashField).toHaveBeenCalledWith(
        registerInput.password,
      );
      expect(userRepo.createUser).toHaveBeenCalledWith({
        ...registerInput,
        password: `hashed-${registerInput.password}`,
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      // Setup
      userRepo.findByEmail.mockResolvedValue(mockUser);

      // Execute & Assert
      await expect(service.register(registerInput)).rejects.toThrow(
        ConflictException,
      );
      expect(userRepo.findByEmail).toHaveBeenCalledWith(registerInput.email);
      expect(userRepo.createUser).not.toHaveBeenCalled();
    });

    it('should throw UnprocessableEntityException if user creation fails', async () => {
      // Setup
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.createUser.mockResolvedValue(null);

      // Execute & Assert
      await expect(service.register(registerInput)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(userRepo.createUser).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully with valid credentials', async () => {
      // Setup
      userRepo.findByEmail.mockResolvedValue({
        ...mockUser,
        password: 'hashed-password123',
      });
      jest
        .spyOn(hashingUtils, 'compareHashedField')
        .mockImplementation(async () => true);

      // Execute
      const result = await service.login(loginInput);

      // Assert
      expect(userRepo.findByEmail).toHaveBeenCalledWith(loginInput.email);
      expect(hashingUtils.compareHashedField).toHaveBeenCalledWith(
        loginInput.password,
        'hashed-password123',
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      expect(result).toEqual({ accessToken: 'mock-jwt-token' });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Setup
      userRepo.findByEmail.mockResolvedValue(null);

      // Execute & Assert
      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepo.findByEmail).toHaveBeenCalledWith(loginInput.email);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      // Setup
      userRepo.findByEmail.mockResolvedValue(mockUser);
      jest
        .spyOn(hashingUtils, 'compareHashedField')
        .mockImplementation(async () => false);

      // Execute & Assert
      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(hashingUtils.compareHashedField).toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('biometricLogin', () => {
    const biometricKey = 'biometric-key-123';
    const fingerprint = 'fingerprint-biometric-key-123';

    it('should login user successfully with valid biometric key', async () => {
      // Setup
      userRepo.findByFingerprint.mockResolvedValue({
        ...mockUserWithBiometric,
        biometricKey: 'encrypted-biometric-key-123', // Match the expected key format
      });

      // This is the important fix - make decrypt return the original biometricKey
      jest.spyOn(encryptionUtils, 'decrypt').mockReturnValueOnce(biometricKey);

      // Execute
      const result = await service.biometricLogin(biometricKey);

      // Assert
      expect(encryptionUtils.hmacFingerprint).toHaveBeenCalledWith(
        biometricKey,
      );
      expect(userRepo.findByFingerprint).toHaveBeenCalledWith(fingerprint);
      expect(encryptionUtils.decrypt).toHaveBeenCalledWith(
        'encrypted-biometric-key-123',
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUserWithBiometric.id,
        email: mockUserWithBiometric.email,
      });
      expect(result).toEqual({ accessToken: 'mock-jwt-token' });
    });

    it('should throw UnauthorizedException if user not found by fingerprint', async () => {
      // Setup
      userRepo.findByFingerprint.mockResolvedValue(null);

      // Execute & Assert
      await expect(service.biometricLogin(biometricKey)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepo.findByFingerprint).toHaveBeenCalledWith(fingerprint);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if biometric key decrypt mismatch', async () => {
      // Setup
      userRepo.findByFingerprint.mockResolvedValue(mockUserWithBiometric);
      jest
        .spyOn(encryptionUtils, 'decrypt')
        .mockReturnValueOnce('wrong-biometric-key');

      // Execute & Assert
      await expect(service.biometricLogin(biometricKey)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(encryptionUtils.decrypt).toHaveBeenCalledWith(
        mockUserWithBiometric.biometricKey,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user has no biometric key stored', async () => {
      // Setup
      userRepo.findByFingerprint.mockResolvedValue({
        ...mockUser,
        biometricKey: null,
      });

      // Execute & Assert
      await expect(service.biometricLogin(biometricKey)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('enableBiometric', () => {
    const userId = 'user-id-1';
    const biometricInput: EnableBiometricLoginInput = {
      biometricKey: 'biometric-key-123',
    };
    const fingerprint = 'fingerprint-biometric-key-123';

    it('should enable biometric login successfully', async () => {
      // Setup
      userRepo.findByFingerprint.mockResolvedValue(null);
      userRepo.updateOne.mockResolvedValue(mockUserWithBiometric);

      // Execute
      const result = await service.enableBiometric(userId, biometricInput);

      // Assert
      expect(encryptionUtils.encrypt).toHaveBeenCalledWith(
        biometricInput.biometricKey,
      );
      expect(encryptionUtils.hmacFingerprint).toHaveBeenCalledWith(
        biometricInput.biometricKey,
      );
      expect(userRepo.findByFingerprint).toHaveBeenCalledWith(fingerprint);
      expect(userRepo.updateOne).toHaveBeenCalledWith(userId, {
        biometricKey: `encrypted-${biometricInput.biometricKey}`,
        biometricKeyFingerprint: fingerprint,
      });
      expect(result).toEqual(mockUserWithBiometric);
    });

    it('should throw ConflictException if biometric key already in use', async () => {
      // Setup
      userRepo.findByFingerprint.mockResolvedValue(mockUserWithBiometric);

      // Execute & Assert
      await expect(
        service.enableBiometric(userId, biometricInput),
      ).rejects.toThrow(ConflictException);
      expect(userRepo.findByFingerprint).toHaveBeenCalledWith(fingerprint);
      expect(userRepo.updateOne).not.toHaveBeenCalled();
    });

    it('should throw UnprocessableEntityException if update fails', async () => {
      // Setup
      userRepo.findByFingerprint.mockResolvedValue(null);
      userRepo.updateOne.mockResolvedValue(null);

      // Execute & Assert
      await expect(
        service.enableBiometric(userId, biometricInput),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(userRepo.updateOne).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    const userId = 'user-id-1';

    it('should return user successfully', async () => {
      // Setup
      userRepo.findById.mockResolvedValue(mockUser);

      // Execute
      const result = await service.findById(userId);

      // Assert
      expect(userRepo.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      // Setup
      userRepo.findById.mockResolvedValue(null);

      // Execute & Assert
      await expect(service.findById(userId)).rejects.toThrow(NotFoundException);
      expect(userRepo.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('signToken', () => {
    it('should generate a token with correct payload', async () => {
      userRepo.findByEmail.mockResolvedValue(mockUser);
      jest
        .spyOn(hashingUtils, 'compareHashedField')
        .mockImplementation(async () => true);

      // Execute
      const result = await service.login({
        email: mockUser.email,
        password: 'password',
      });

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      expect(result).toEqual({ accessToken: 'mock-jwt-token' });
    });
  });
});
