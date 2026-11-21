import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserProfileDto {
  @ApiProperty({ example: 'a0000000-0000-0000-0000-000000000001' })
  id: string;

  @ApiProperty({ example: 'organizer@eticket.com' })
  email: string;

  @ApiPropertyOptional({ example: 'Channthy' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Tha' })
  lastName?: string;

  @ApiPropertyOptional({ example: 'Cambodia Tech Events Ltd.' })
  organizationName?: string;

  @ApiPropertyOptional({ example: '+85598765432' })
  phoneNumber?: string;

  @ApiProperty({ enum: Role, example: Role.ORGANIZER })
  role: Role;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-11-15T08:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-11-15T08:00:00.000Z' })
  updatedAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT Bearer access token',
  })
  accessToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ example: '7d' })
  expiresIn: string;
}
