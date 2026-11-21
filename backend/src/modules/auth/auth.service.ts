import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { PublicRegistrationRole, RegisterDto } from './dto/register.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

export interface VerifiedGoogleIdentity {
  googleId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  private readonly jwtExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtExpiresIn =
      this.configService.get<string>('jwt.expiresIn') ||
      this.configService.get<string>('JWT_EXPIRES_IN') ||
      '7d';
  }

  /**
   * Register a new Customer account
   */
  async registerCustomer(dto: RegisterCustomerDto): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    await this.ensureEmailNotRegistered(normalizedEmail);

    const hashedPassword = await this.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phoneNumber: dto.phoneNumber?.trim() || null,
        role: Role.CUSTOMER,
      },
    });

    return this.generateAuthResponse(user);
  }

  /**
   * Register a new Organization account
   */
  async registerOrganization(
    dto: RegisterOrganizationDto,
  ): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    await this.ensureEmailNotRegistered(normalizedEmail);

    const hashedPassword = await this.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        organizationName: dto.organizationName.trim(),
        firstName: dto.firstName?.trim() || null,
        lastName: dto.lastName?.trim() || null,
        phoneNumber: dto.phoneNumber?.trim() || null,
        role: Role.ORGANIZER,
      },
    });

    return this.generateAuthResponse(user);
  }

  /**
   * Unified public registration endpoint restricted strictly to CUSTOMER or ORGANIZER.
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    await this.ensureEmailNotRegistered(normalizedEmail);

    const requestedRole = dto.role || PublicRegistrationRole.CUSTOMER;
    const role =
      requestedRole === PublicRegistrationRole.ORGANIZER
        ? Role.ORGANIZER
        : Role.CUSTOMER;

    if (role === Role.ORGANIZER && !dto.organizationName?.trim()) {
      throw new BadRequestException(
        'Organization name is required when registering as an organizer',
      );
    }

    const hashedPassword = await this.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName: dto.firstName?.trim() || null,
        lastName: dto.lastName?.trim() || null,
        organizationName: dto.organizationName?.trim() || null,
        phoneNumber: dto.phoneNumber?.trim() || null,
        role,
      },
    });

    return this.generateAuthResponse(user);
  }

  /**
   * Authenticate user with email and password
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('This account has been suspended');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'This account uses Google Sign-In. Please continue with Google.',
      );
    }

    const isPasswordValid = await this.comparePassword(
      dto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateAuthResponse(user);
  }

  /**
   * Public configuration for Google Sign-In UI (exposes only public OAuth Client ID)
   */
  getGoogleConfig(): { enabled: boolean; clientId: string | null } {
    const clientId = this.getGoogleClientId();
    return {
      enabled: Boolean(clientId),
      clientId: clientId || null,
    };
  }

  /**
   * Verify a real Google ID token or OAuth2 access token with Google and issue platform session credentials
   */
  async authenticateWithGoogle(dto: GoogleAuthDto): Promise<AuthResponseDto> {
    const clientId = this.getGoogleClientId();
    if (!clientId) {
      throw new ServiceUnavailableException(
        'Google Sign-In is not configured on this server. Add GOOGLE_CLIENT_ID to your .env file and restart the backend.',
      );
    }

    if (!dto.credential && !dto.accessToken) {
      throw new BadRequestException(
        'A Google credential or access token is required.',
      );
    }

    const identity = await this.verifyGoogleIdentity(clientId, dto);

    let user = await this.prisma.user.findUnique({
      where: { googleId: identity.googleId },
    });

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: identity.email },
      });
    }

    if (user) {
      if (user.isActive === false) {
        throw new UnauthorizedException('This account has been suspended');
      }

      if (!user.googleId || (identity.avatarUrl && user.avatarUrl !== identity.avatarUrl)) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: user.googleId ?? identity.googleId,
            avatarUrl: identity.avatarUrl ?? user.avatarUrl,
            firstName: user.firstName ?? identity.firstName ?? null,
            lastName: user.lastName ?? identity.lastName ?? null,
          },
        });
      }

      return this.generateAuthResponse(user);
    }

    const role =
      dto.accountType === PublicRegistrationRole.ORGANIZER
        ? Role.ORGANIZER
        : Role.CUSTOMER;

    const organizationName =
      role === Role.ORGANIZER
        ? dto.organizationName?.trim() ||
          `${identity.firstName || identity.email.split('@')[0]} Events`
        : null;

    const createdUser = await this.prisma.user.create({
      data: {
        email: identity.email,
        googleId: identity.googleId,
        avatarUrl: identity.avatarUrl || null,
        password: null,
        firstName: identity.firstName?.trim() || null,
        lastName: identity.lastName?.trim() || null,
        organizationName,
        role,
      },
    });

    return this.generateAuthResponse(createdUser);
  }

  protected async verifyGoogleIdentity(
    clientId: string,
    dto: GoogleAuthDto,
  ): Promise<VerifiedGoogleIdentity> {
    const client = new OAuth2Client(clientId);

    try {
      if (dto.credential) {
        const ticket = await client.verifyIdToken({
          idToken: dto.credential,
          audience: clientId,
        });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email || !payload.email_verified) {
          throw new UnauthorizedException(
            'Google account email must be verified.',
          );
        }

        return {
          googleId: payload.sub,
          email: payload.email.trim().toLowerCase(),
          firstName: payload.given_name,
          lastName: payload.family_name,
          avatarUrl: payload.picture,
        };
      }

      const tokenInfo = await client.getTokenInfo(dto.accessToken!);
      if (tokenInfo.aud !== clientId || tokenInfo.email_verified === false) {
        throw new UnauthorizedException(
          'Google token does not match this application.',
        );
      }

      const userInfoRes = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: {
            Authorization: `Bearer ${dto.accessToken}`,
          },
        },
      );

      if (!userInfoRes.ok) {
        throw new UnauthorizedException(
          'Unable to verify Google account profile.',
        );
      }

      const profile = (await userInfoRes.json()) as {
        sub?: string;
        email?: string;
        email_verified?: boolean;
        given_name?: string;
        family_name?: string;
        picture?: string;
      };

      if (!profile.sub || !profile.email || !profile.email_verified) {
        throw new UnauthorizedException(
          'Google account email must be verified.',
        );
      }

      return {
        googleId: profile.sub,
        email: profile.email.trim().toLowerCase(),
        firstName: profile.given_name,
        lastName: profile.family_name,
        avatarUrl: profile.picture,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException(
        'Invalid or expired Google Sign-In verification.',
      );
    }
  }

  private getGoogleClientId(): string {
    return (
      this.configService.get<string>('google.clientId') ||
      this.configService.get<string>('GOOGLE_CLIENT_ID') ||
      ''
    ).trim();
  }

  /**
   * Get safe profile of currently authenticated user
   */
  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return this.toUserProfile(user);
  }

  // --- Helpers ---

  private async ensureEmailNotRegistered(email: string): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(
        `An account with the email "${email}" is already registered`,
      );
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  private async comparePassword(
    plain: string,
    hashed: string,
  ): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  private generateAuthResponse(user: User): AuthResponseDto {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      user: this.toUserProfile(user),
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.jwtExpiresIn,
    };
  }

  private toUserProfile(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      organizationName: user.organizationName ?? undefined,
      phoneNumber: user.phoneNumber ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
