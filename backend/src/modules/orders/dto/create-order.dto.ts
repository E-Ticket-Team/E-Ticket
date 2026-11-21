import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CANONICAL_UUID_REGEX } from '../../../common/constants/uuid.constant';

export class OrderItemInputDto {
  @ApiProperty({ example: 'c0000000-0000-0000-0000-000000000001' })
  @IsString()
  @Matches(CANONICAL_UUID_REGEX, {
    message: 'ticketTypeId must be a valid UUID',
  })
  ticketTypeId: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  @ApiPropertyOptional({
    example: 'Dara Sok',
    description: 'Buyer full name (required when checking out as a guest)',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  guestName?: string;

  @ApiPropertyOptional({
    example: 'dara.sok@gmail.com',
    description: 'Buyer email address (required when checking out as a guest)',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address for your tickets' })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  guestEmail?: string;

  @ApiPropertyOptional({
    example: '+85512345678',
    description: 'Optional buyer contact phone number for guest orders',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  guestPhone?: string;
}

export class CancelOrderDto {
  @ApiPropertyOptional({ example: 'Customer changed plans' })
  @IsString()
  @IsOptional()
  reason?: string;
}
