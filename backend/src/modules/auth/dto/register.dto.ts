import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'user@eticket.com',
    description: 'Unique email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Password (minimum 6 characters)',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiPropertyOptional({
    enum: Role,
    default: Role.CUSTOMER,
    description: 'User role: CUSTOMER or ORGANIZER',
  })
  @IsEnum(Role, { message: 'Role must be either CUSTOMER or ORGANIZER' })
  @IsOptional()
  role?: Role = Role.CUSTOMER;

  @ApiPropertyOptional({
    example: 'Cambodia Tech Events Ltd.',
    description: 'Organization name (applicable when registering as an organization)',
  })
  @IsString({ message: 'Organization name must be a string' })
  @IsOptional()
  organizationName?: string;

  @ApiPropertyOptional({
    example: 'Sophea',
    description: 'First name',
  })
  @IsString({ message: 'First name must be a string' })
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Sreng',
    description: 'Last name',
  })
  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    example: '+85512345678',
    description: 'Contact phone number',
  })
  @IsString({ message: 'Phone number must be a string' })
  @IsOptional()
  phoneNumber?: string;
}
