import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum EventStatusEnum {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export class CreateEventDto {
  @ApiProperty({ example: 'Phnom Penh Music Festival 2026' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: 'An outdoor music concert celebrating contemporary artists.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Music' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 'Koh Pich Theater' })
  @IsString()
  @IsNotEmpty()
  venue: string;

  @ApiPropertyOptional({ example: 'Phnom Penh, Cambodia' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: 'https://example.com/images/banner.jpg' })
  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @ApiProperty({ example: '2026-12-25T18:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-12-25T23:00:00.000Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ enum: EventStatusEnum, default: EventStatusEnum.DRAFT })
  @IsEnum(EventStatusEnum)
  @IsOptional()
  status?: EventStatusEnum;

  @ApiProperty({ example: 'a0000000-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  organizerId: string;
}

