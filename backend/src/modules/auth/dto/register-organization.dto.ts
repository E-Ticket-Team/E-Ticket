import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterOrganizationDto {
  @ApiProperty({
    example: 'organizer@eticket.com',
    description: 'Unique email address for organization account',
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

  @ApiProperty({
    example: 'Cambodia Tech Events Ltd.',
    description: 'Legal or operating name of the organization',
  })
  @IsString({ message: 'Organization name must be a string' })
  @IsNotEmpty({ message: 'Organization name is required' })
  organizationName: string;

  @ApiPropertyOptional({
    example: 'Channthy',
    description: 'Contact person first name',
  })
  @IsString({ message: 'First name must be a string' })
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Tha',
    description: 'Contact person last name',
  })
  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    example: '+85598765432',
    description: 'Organization contact phone number',
  })
  @IsString({ message: 'Phone number must be a string' })
  @IsOptional()
  phoneNumber?: string;
}
