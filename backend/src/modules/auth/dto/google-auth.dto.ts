import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PublicRegistrationRole } from './register.dto';

export class GoogleAuthDto {
  @ApiPropertyOptional({
    description: 'Signed Google Identity Services ID token (JWT)',
  })
  @IsOptional()
  @IsString()
  credential?: string;

  @ApiPropertyOptional({
    description:
      'Google OAuth2 access token issued by Google Identity Services token client',
  })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({
    enum: PublicRegistrationRole,
    description:
      'Account type when registering a new user via Google (CUSTOMER or ORGANIZER)',
  })
  @IsOptional()
  @IsEnum(PublicRegistrationRole)
  accountType?: PublicRegistrationRole;

  @ApiPropertyOptional({
    example: 'Phnom Penh Live Events',
    description:
      'Optional organization name when registering a new ORGANIZER via Google',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  organizationName?: string;
}
