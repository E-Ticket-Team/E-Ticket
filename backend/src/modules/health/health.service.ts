import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async check(): Promise<HealthResponseDto> {
    const dbHealth = await this.prisma.checkHealth();
    const isHealthy = dbHealth.status === 'up';

    const response: HealthResponseDto = {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: this.configService.get<string>('nodeEnv', 'development'),
      version: '1.0.0',
      database: dbHealth,
    };

    if (!isHealthy) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }
}
