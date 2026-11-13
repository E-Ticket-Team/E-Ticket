import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to PostgreSQL via Prisma');
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL database', error);
      // We don't exit process here so health checks can still report database down
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL database');
  }

  async checkHealth(): Promise<{
    status: 'up' | 'down';
    latencyMs: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      await this.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (error: any) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: error?.message || 'Database query failed',
      };
    }
  }
}
