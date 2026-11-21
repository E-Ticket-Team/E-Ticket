import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role, TicketStatus } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedActor } from '../events/events.service';
import { AssignScannerDto } from './dto/assign-scanner.dto';
import { OrganizerService } from './organizer.service';

@ApiTags('Organizer')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
@Controller('organizer')
export class OrganizerController {
  constructor(private readonly organizerService: OrganizerService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get organizer dashboard summary, revenue metrics, and sales series',
  })
  getDashboard(@CurrentUser() user: AuthenticatedActor) {
    return this.organizerService.getDashboard(user);
  }

  @Get('orders')
  @ApiOperation({
    summary: 'List orders referencing the organizer events',
  })
  getOrders(@CurrentUser() user: AuthenticatedActor) {
    return this.organizerService.getOrganizerOrders(user);
  }

  @Get('events/:eventId/analytics')
  @ApiOperation({
    summary: 'Get per-event sales, tier distribution, and check-in analytics',
  })
  getEventAnalytics(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthenticatedActor,
  ) {
    return this.organizerService.getEventAnalytics(eventId, user);
  }

  @Get('events/:eventId/attendees')
  @ApiOperation({
    summary: 'List attendees and ticket statuses for an owned event',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'ticketTypeId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TicketStatus })
  getEventAttendees(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthenticatedActor,
    @Query('search') search?: string,
    @Query('ticketTypeId') ticketTypeId?: string,
    @Query('status') status?: TicketStatus,
  ) {
    return this.organizerService.getEventAttendees(eventId, user, {
      search,
      ticketTypeId,
      status,
    });
  }

  @Get('events/:eventId/check-ins')
  @ApiOperation({
    summary: 'List gate check-in records for an owned event',
  })
  getEventCheckIns(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthenticatedActor,
  ) {
    return this.organizerService.getEventCheckIns(eventId, user);
  }

  @Get('events/:eventId/scanners')
  @ApiOperation({
    summary: 'List scanner accounts authorized for an event',
  })
  getEventScanners(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthenticatedActor,
  ) {
    return this.organizerService.getEventScanners(eventId, user);
  }

  @Post('events/:eventId/scanners')
  @ApiOperation({
    summary: 'Authorize a SCANNER user for an event by email',
  })
  assignScanner(
    @Param('eventId') eventId: string,
    @Body() dto: AssignScannerDto,
    @CurrentUser() user: AuthenticatedActor,
  ) {
    return this.organizerService.assignScanner(eventId, dto, user);
  }

  @Delete('events/:eventId/scanners/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke a scanner assignment for an event',
  })
  removeScanner(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedActor,
  ) {
    return this.organizerService.removeScanner(eventId, userId, user);
  }
}
