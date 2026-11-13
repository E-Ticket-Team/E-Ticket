import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: T;

  @ApiProperty({ example: '2026-11-13T05:40:00.000Z' })
  timestamp: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: 'Validation failed' })
  message: string | string[];

  @ApiProperty({ example: '2026-11-13T05:40:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/v1/events' })
  path: string;

  @ApiProperty({ example: 'POST' })
  method: string;
}

