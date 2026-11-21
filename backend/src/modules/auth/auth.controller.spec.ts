import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_COOKIE_NAME } from './auth.constants';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthResponse = {
    user: {
      id: 'uuid-1',
      email: 'user@eticket.com',
      firstName: 'Test',
      lastName: 'User',
      role: Role.CUSTOMER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    accessToken: 'test-token',
    tokenType: 'Bearer',
    expiresIn: '7d',
  };

  const mockAuthService = {
    registerCustomer: jest.fn().mockResolvedValue(mockAuthResponse),
    registerOrganization: jest.fn().mockResolvedValue({
      ...mockAuthResponse,
      user: {
        ...mockAuthResponse.user,
        organizationName: 'Test Org',
        role: Role.ORGANIZER,
      },
    }),
    register: jest.fn().mockResolvedValue(mockAuthResponse),
    login: jest.fn().mockResolvedValue(mockAuthResponse),
    getProfile: jest.fn().mockResolvedValue(mockAuthResponse.user),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'jwt.cookieSecure') return false;
      if (key === 'jwt.expiresIn') return '7d';
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register a customer and set HttpOnly session cookie', async () => {
    const dto = {
      email: 'customer@eticket.com',
      password: 'Password123!',
      firstName: 'Sophea',
      lastName: 'Sreng',
    };
    const mockRes = { cookie: jest.fn() } as any;
    const result = await controller.registerCustomer(dto, mockRes);
    expect(service.registerCustomer).toHaveBeenCalledWith(dto);
    expect(mockRes.cookie).toHaveBeenCalledWith(
      AUTH_COOKIE_NAME,
      'test-token',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
    expect(result).toEqual(mockAuthResponse);
  });

  it('should register an organization', async () => {
    const dto = {
      email: 'organizer@eticket.com',
      password: 'Password123!',
      organizationName: 'Test Org',
    };
    const result = await controller.registerOrganization(dto);
    expect(service.registerOrganization).toHaveBeenCalledWith(dto);
    expect(result.user.role).toBe(Role.ORGANIZER);
  });

  it('should login a user', async () => {
    const dto = {
      email: 'user@eticket.com',
      password: 'Password123!',
    };
    const result = await controller.login(dto);
    expect(service.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockAuthResponse);
  });

  it('should clear cookie on logout', () => {
    const mockRes = { clearCookie: jest.fn() } as any;
    const res = controller.logout(mockRes);
    expect(mockRes.clearCookie).toHaveBeenCalledWith(
      AUTH_COOKIE_NAME,
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
    expect(res).toEqual({ loggedOut: true });
  });

  it('should return current user profile', async () => {
    const result = await controller.getCurrentUser('uuid-1');
    expect(service.getProfile).toHaveBeenCalledWith('uuid-1');
    expect(result).toEqual(mockAuthResponse.user);
  });
});
