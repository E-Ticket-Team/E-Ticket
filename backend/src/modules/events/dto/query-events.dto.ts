import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { EventStatusEnum } from './create-event.dto';

export class QueryEventsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 12;

  @ApiPropertyOptional({ description: 'Search by title, venue, location, or description' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ enum: EventStatusEnum, description: 'Filter by event status' })
  @IsEnum(EventStatusEnum)
  @IsOptional()
  status?: EventStatusEnum;

  @ApiPropertyOptional({ description: 'Filter events starting on or after this ISO date' })
  @IsDateString()
  @IsOptional()
  startAfter?: string;

  @ApiPropertyOptional({ description: 'Filter events starting on or before this ISO date' })
  @IsDateString()
  @IsOptional()
  endBefore?: string;

  @ApiPropertyOptional({ enum: ['startDate', 'createdAt', 'title'], default: 'startDate' })
  @IsIn(['startDate', 'createdAt', 'title'])
  @IsOptional()
  sortBy?: 'startDate' | 'createdAt' | 'title' = 'startDate';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({ description: 'Return only events owned by the authenticated organizer' })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  mine?: boolean;
}
