import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateTicketTypeDto {
  @ApiPropertyOptional({ example: 'VIP All-Access Pass' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Front-row seating and backstage lounge' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 75.0, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: 250, minimum: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  totalQuantity?: number;
}
