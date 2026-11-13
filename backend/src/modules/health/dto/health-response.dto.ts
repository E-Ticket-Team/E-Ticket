import { ApiProperty } from '@nestjs/swagger';

export class DatabaseHealthDto {
  @ApiProperty({ example: 'up', enum: ['up', 'down'] })
  status: 'up' | 'down';

  @ApiProperty({ example: 4, description: 'Query latency in milliseconds' })
  latencyMs: number;

  @ApiProperty({ required: false, example: 'Connection refused' })
  error?: string;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'error'] })
  status: 'ok' | 'error';

  @ApiProperty({ example: '2026-11-13T05:40:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: 120.45, description: 'Application uptime in seconds' })
  uptime: number;

  @ApiProperty({ example: 'development' })
  environment: string;

  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ type: () => DatabaseHealthDto })
  database: DatabaseHealthDto;
}
