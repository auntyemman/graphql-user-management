import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterInput } from './dto/create-user.input';
import { UserRepository } from './users.repository';

describe('UserRepository', () => {
  let repository: UserRepository;
  let prismaService: PrismaService;

  // Mock user data that matches Prisma's expected shape
  const mockUser = {
    id: 'user-id-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword123',
    biometricKey: 'bio-key-123',
    biometricKeyFingerprint: 'fingerprint-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock register input
  const mockRegisterInput: RegisterInput = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  };

  beforeEach(async () => {
    // Create a mock for PrismaService with all required methods
    const mockPrismaService = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      // Setup the mock to return our test user
      jest
        .spyOn(prismaService.user, 'create')
        .mockResolvedValue(mockUser as any);

      // Call the method we're testing
      const result = await repository.createUser(mockRegisterInput);

      // Verify the prisma client was called correctly
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: mockRegisterInput,
      });

      // Verify the result is what we expect
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      // Setup the mock
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);

      // Call the method
      const result = await repository.findByEmail('test@example.com');

      // Verify prisma client call
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });

      // Verify result
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      // Setup the mock to return null
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      // Call the method
      const result = await repository.findByEmail('nonexistent@example.com');

      // Verify prisma client call
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });

      // Verify result
      expect(result).toBeNull();
    });
  });

  describe('findByBiometricKey', () => {
    it('should find a user by biometric key', async () => {
      // Setup the mock
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);

      // Call the method
      const result = await repository.findByBiometricKey('bio-key-123');

      // Verify prisma client call
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { biometricKey: 'bio-key-123' },
      });

      // Verify result
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByFingerprint', () => {
    it('should find a user by biometric key fingerprint', async () => {
      // Setup the mock
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);

      // Call the method
      const result = await repository.findByFingerprint('fingerprint-123');

      // Verify prisma client call
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { biometricKeyFingerprint: 'fingerprint-123' },
      });

      // Verify result
      expect(result).toEqual(mockUser);
    });
  });

  describe('findById', () => {
    it('should find a user by id', async () => {
      // Setup the mock
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);

      // Call the method
      const result = await repository.findById('user-id-1');

      // Verify prisma client call
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id-1' },
      });

      // Verify result
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateOne', () => {
    it('should update a user', async () => {
      const updateData = {
        name: 'Updated Name',
        biometricKey: 'new-bio-key',
      };

      const updatedUser = {
        ...mockUser,
        ...updateData,
      };

      // Setup the mock
      jest
        .spyOn(prismaService.user, 'update')
        .mockResolvedValue(updatedUser as any);

      // Call the method
      const result = await repository.updateOne('user-id-1', updateData);

      // Verify prisma client call
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-1' },
        data: updateData,
      });

      // Verify result
      expect(result).toEqual(updatedUser);
      expect(result.name).toBe('Updated Name');
      expect(result.biometricKey).toBe('new-bio-key');
    });

    it('should throw an error when updating non-existent user', async () => {
      // Setup the mock to throw an error
      const prismaError = new Error('Record to update not found');
      jest.spyOn(prismaService.user, 'update').mockRejectedValue(prismaError);

      // Call the method and expect it to throw
      await expect(
        repository.updateOne('non-existent-id', { name: 'New Name' }),
      ).rejects.toThrow();

      // Verify prisma client call
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
        data: { name: 'New Name' },
      });
    });
  });
});
