import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedActor } from '../events/events.service';
import { CancelOrderDto, CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a ticket order and atomically reserve inventory',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Order created and inventory reserved' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Insufficient ticket inventory' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.createOrder(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all orders placed by the authenticated user' })
  findMine(@CurrentUser('id') userId: string) {
    return this.ordersService.getMyOrders(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details, payment attempts, and issued tickets' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedActor,
  ) {
    return this.ordersService.getOrderById(id, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a pending order (or refund an unused paid order) and release inventory',
  })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedActor,
  ) {
    return this.ordersService.cancelOrder(id, dto, user);
  }
}
