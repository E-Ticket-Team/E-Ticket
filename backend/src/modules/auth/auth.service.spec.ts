import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicRegistrationRole } from './dto/register.dto';

describe('AuthService', () => {
  let service: AuthService;

  const mockHashedPassword = bcrypt.hashSync('Password123!', 10);

  const mockCustomerUser = {
    id: 'customer-uuid-1',
    email: 'customer@eticket.com',
    password: mockHashedPassword,
    firstName: 'Sophea',
    lastName: 'Sreng',
    organizationName: null,
    phoneNumber: '+85512345678',
    role: Role.CUSTOMER,
    isActive: true,
    createdAt: new Date('2026-11-15T08:00:00.000Z'),
    updatedAt: new Date('2026-11-15T08:00:00.000Z'),
  };

  const mockOrganizerUser = {
    id: 'organizer-uuid-1',
    email: 'organizer@eticket.com',
    password: mockHashedPassword,
    firstName: 'Channthy',
    lastName: 'Tha',
    organizationName: 'Cambodia Tech Events Ltd.',
    phoneNumber: '+85598765432',
    role: Role.ORGANIZER,
    isActive: true,
    createdAt: new Date('2026-11-15T08:00:00.000Z'),
    updatedAt: new Date('2026-11-15T08:00:00.000Z'),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token-xyz'),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'jwt.expiresIn' || key === 'JWT_EXPIRES_IN') return '7d';
      if (key === 'jwt.secret' || key === 'JWT_SECRET') return 'test-secret';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerCustomer', () => {
    it('should successfully register a customer and return an auth response', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockCustomerUser);

      const result = await service.registerCustomer({
        email: 'customer@eticket.com',
        password: 'Password123!',
        firstName: 'Sophea',
        lastName: 'Sreng',
        phoneNumber: '+85512345678',
      });

      expect(result.accessToken).toBe('mock-jwt-token-xyz');
      expect(result.user.role).toBe(Role.CUSTOMER);
      expect(result.user.isActive).toBe(true);
      expect((result.user as any).password).toBeUndefined();
    });

    it('should throw ConflictException if customer email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockCustomerUser);

      await expect(
        service.registerCustomer({
          email: 'customer@eticket.com',
          password: 'Password123!',
          firstName: 'Sophea',
          lastName: 'Sreng',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('registerOrganization', () => {
    it('should successfully register an organization and return an auth response', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockOrganizerUser);

      const result = await service.registerOrganization({
        email: 'organizer@eticket.com',
        password: 'Password123!',
        organizationName: 'Cambodia Tech Events Ltd.',
        firstName: 'Channthy',
        lastName: 'Tha',
        phoneNumber: '+85598765432',
      });

      expect(result.accessToken).toBe('mock-jwt-token-xyz');
      expect(result.user.role).toBe(Role.ORGANIZER);
      expect(result.user.organizationName).toBe('Cambodia Tech Events Ltd.');
      expect((result.user as any).password).toBeUndefined();
    });

    it('should require organizationName in unified register for ORGANIZER', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.register({
          email: 'org@eticket.com',
          password: 'Password123!',
          role: PublicRegistrationRole.ORGANIZER,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should authenticate valid credentials and return access token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockCustomerUser);

      const result = await service.login({
        email: 'customer@eticket.com',
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('mock-jwt-token-xyz');
      expect(result.user.email).toBe('customer@eticket.com');
      expect(result.tokenType).toBe('Bearer');
      expect((result.user as any).password).toBeUndefined();
    });

    it('should throw UnauthorizedException when account is suspended', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockCustomerUser,
        isActive: false,
      });

      await expect(
        service.login({
          email: 'customer@eticket.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when email does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@eticket.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockCustomerUser);

      await expect(
        service.login({
          email: 'customer@eticket.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return safe user profile for existing user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockOrganizerUser);

      const profile = await service.getProfile('organizer-uuid-1');

      expect(profile.id).toBe('organizer-uuid-1');
      expect(profile.organizationName).toBe('Cambodia Tech Events Ltd.');
      expect((profile as any).password).toBeUndefined();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('non-existent-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
