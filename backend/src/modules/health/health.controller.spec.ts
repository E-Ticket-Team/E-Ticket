import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ServiceUnavailableException } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  const mockHealthyResponse = {
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
    uptime: 100,
    environment: 'test',
    version: '1.0.0',
    database: {
      status: 'up' as const,
      latencyMs: 5,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            check: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status ok when database is up', async () => {
    jest.spyOn(service, 'check').mockResolvedValue(mockHealthyResponse);

    const result = await controller.getHealth();
    expect(result).toEqual(mockHealthyResponse);
    expect(result.status).toBe('ok');
    expect(result.database.status).toBe('up');
  });

  it('should throw ServiceUnavailableException when database is down', async () => {
    const mockUnhealthyResponse = {
      ...mockHealthyResponse,
      status: 'error' as const,
      database: {
        status: 'down' as const,
        latencyMs: 15,
        error: 'Connection refused',
      },
    };

    jest
      .spyOn(service, 'check')
      .mockRejectedValue(new ServiceUnavailableException(mockUnhealthyResponse));

    await expect(controller.getHealth()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
