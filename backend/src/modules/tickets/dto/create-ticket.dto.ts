import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDecimal,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateTicketTypeDto {
  @ApiProperty({ example: 'a0000000-0000-0000-0000-000000000002' })
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({ example: 'VIP Access' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Includes front-row seating and complimentary refreshments' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 45.0 })
  @IsPositive()
  price: number;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(1)
  totalQuantity: number;
}

export class ValidateTicketDto {
  @ApiProperty({ example: 'TKT-2026-ABCD-1234' })
  @IsString()
  @IsNotEmpty()
  ticketCode: string;
}
