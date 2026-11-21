import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTicketTypeDto {
  @ApiProperty({ example: 'b0000000-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({ example: 'VIP Access' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Includes front-row seating and complimentary refreshments',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 45.0, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty({ example: 100, minimum: 1 })
  @IsInt()
  @Min(1)
  totalQuantity: number;
}

export class ValidateTicketDto {
  @ApiProperty({
    example: 'TKT-2026-VIP-001',
    description: 'Ticket code or signed ETK1 QR payload',
  })
  @IsString()
  @IsNotEmpty()
  ticketCode: string;

  @ApiPropertyOptional({
    example: 'b0000000-0000-0000-0000-000000000001',
    description: 'Optional event ID to verify the ticket belongs to the selected gate event',
  })
  @IsString()
  @IsOptional()
  eventId?: string;
}
