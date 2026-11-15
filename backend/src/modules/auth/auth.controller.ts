import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
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
  constructor(private readonly authService: AuthService) {}

  @Post('register/customer')
  @ApiOperation({
    summary: 'Register a new customer',
    description: 'Creates a customer account and returns JWT credentials',
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
  registerCustomer(
    @Body() dto: RegisterCustomerDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerCustomer(dto);
  }

  @Post('register/organization')
  @ApiOperation({
    summary: 'Register a new organization / event organizer',
    description:
      'Creates an organization account with ORGANIZER role and returns JWT credentials',
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
  registerOrganization(
    @Body() dto: RegisterOrganizationDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerOrganization(dto);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Unified registration (Customer or Organization)',
    description:
      'Creates an account based on provided role (defaults to CUSTOMER if omitted)',
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
  register(
    @Body() dto: RegisterDto,
  ): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user (login)',
    description:
      'Validates email and password credentials for either customers or organizations and returns a JWT Bearer access token',
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
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current authenticated user profile',
    description:
      'Returns the profile details of the user associated with the provided JWT Bearer token',
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
