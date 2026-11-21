import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { PublicRegistrationRole, RegisterDto } from './dto/register.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

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
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
