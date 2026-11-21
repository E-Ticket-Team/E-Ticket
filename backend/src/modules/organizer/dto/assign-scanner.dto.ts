import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class AssignScannerDto {
  @ApiProperty({ example: 'scanner@eticket.com' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;
}

export class AssignTeamMemberDto extends AssignScannerDto {
  @ApiPropertyOptional({ example: 'Dara' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Sok' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    minLength: 8,
    description: 'Required when registering a brand-new gate staff login',
  })
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Optional event UUIDs created by the organization; defaults to all created events',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  eventIds?: string[];
}
