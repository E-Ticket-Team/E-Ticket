import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { AuthenticatedActor } from '../events/events.service';
import { CancelOrderDto, CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary:
      'Create a ticket order (authenticated user or guest) and atomically reserve inventory',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Order created and inventory reserved' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Insufficient ticket inventory' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedActor | null,
  ) {
    return this.ordersService.createOrder(user?.id ?? null, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all orders placed by the authenticated user' })
  findMine(@CurrentUser('id') userId: string) {
    return this.ordersService.getMyOrders(userId);
  }

  @Get(':id')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get order details, payment attempts, and issued tickets (user or guest token)',
  })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedActor | null,
    @Headers('x-guest-token') guestTokenHeader?: string,
    @Query('token') guestTokenQuery?: string,
  ) {
    return this.ordersService.getOrderById(
      id,
      user,
      guestTokenHeader || guestTokenQuery || null,
    );
  }

  @Post(':id/cancel')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a pending order (or refund an unused paid order) and release inventory',
  })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedActor | null,
    @Headers('x-guest-token') guestTokenHeader?: string,
    @Query('token') guestTokenQuery?: string,
  ) {
    return this.ordersService.cancelOrder(
      id,
      dto,
      user,
      guestTokenHeader || guestTokenQuery || null,
    );
  }
}
