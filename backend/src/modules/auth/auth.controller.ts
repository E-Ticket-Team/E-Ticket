import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Optional,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { AUTH_COOKIE_NAME, parseDurationMs } from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly cookieSecure: boolean;
  private readonly cookieMaxAgeMs: number;

  constructor(
    private readonly authService: AuthService,
    @Optional() private readonly configService?: ConfigService,
  ) {
    this.cookieSecure =
      this.configService?.get<boolean>('jwt.cookieSecure') ?? false;
    const expiresIn =
      this.configService?.get<string>('jwt.expiresIn') || '7d';
    this.cookieMaxAgeMs = parseDurationMs(expiresIn);
  }

  private setAuthCookie(res: Response | undefined, token: string): void {
    if (!res || typeof res.cookie !== 'function') {
      return;
    }
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.cookieSecure,
      path: '/',
      maxAge: this.cookieMaxAgeMs,
    });
  }

  private clearAuthCookie(res: Response | undefined): void {
    if (!res || typeof res.clearCookie !== 'function') {
      return;
    }
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.cookieSecure,
      path: '/',
    });
  }

  @Post('register/customer')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Register a new customer',
    description:
      'Creates a customer account, sets HttpOnly session cookie, and returns JWT credentials',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Customer registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email is already registered',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  async registerCustomer(
    @Body() dto: RegisterCustomerDto,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<AuthResponseDto> {
    const auth = await this.authService.registerCustomer(dto);
    this.setAuthCookie(res, auth.accessToken);
    return auth;
  }

  @Post('register/organization')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Register a new organization / event organizer',
    description:
      'Creates an organization account with ORGANIZER role, sets HttpOnly session cookie, and returns JWT credentials',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Organization registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email is already registered',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  async registerOrganization(
    @Body() dto: RegisterOrganizationDto,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<AuthResponseDto> {
    const auth = await this.authService.registerOrganization(dto);
    this.setAuthCookie(res, auth.accessToken);
    return auth;
  }

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Unified public registration (Customer or Organization only)',
    description:
      'Creates a CUSTOMER or ORGANIZER account (ADMIN and SCANNER roles cannot be self-assigned)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email is already registered',
  })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<AuthResponseDto> {
    const auth = await this.authService.register(dto);
    this.setAuthCookie(res, auth.accessToken);
    return auth;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @ApiOperation({
    summary: 'Authenticate user (login)',
    description:
      'Validates email and password credentials, sets HttpOnly auth cookie, and returns a JWT Bearer access token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authentication successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid email or password',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<AuthResponseDto> {
    const auth = await this.authService.login(dto);
    this.setAuthCookie(res, auth.accessToken);
    return auth;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log out current user',
    description: 'Clears the HttpOnly authentication session cookie',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logged out successfully',
  })
  logout(@Res({ passthrough: true }) res?: Response): { loggedOut: boolean } {
    this.clearAuthCookie(res);
    return { loggedOut: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current authenticated user profile',
    description:
      'Returns the profile details of the user associated with the provided JWT session cookie or Bearer token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authenticated user profile',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing, expired, or invalid JWT token',
  })
  getCurrentUser(
    @CurrentUser('id') userId: string,
  ): Promise<UserProfileDto> {
    return this.authService.getProfile(userId);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Alias endpoint to get current authenticated user profile',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authenticated user profile',
    type: UserProfileDto,
  })
  getProfile(
    @CurrentUser('id') userId: string,
  ): Promise<UserProfileDto> {
    return this.authService.getProfile(userId);
  }
}
