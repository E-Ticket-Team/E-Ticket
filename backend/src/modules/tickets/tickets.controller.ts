import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedActor } from '../events/events.service';
import { CreateTicketTypeDto, ValidateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { TicketsService } from './tickets.service';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new ticket tier for an event (Owner / Admin only)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Ticket type created successfully',
  })
  createType(
    @Body() dto: CreateTicketTypeDto,
    @CurrentUser() user: AuthenticatedActor,
  ) {
    return this.ticketsService.createTicketType(dto, user);
  }

  @Patch('types/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update an existing ticket tier (Owner / Admin only)',
  })
  updateType(
    @Param('id') id: string,
    @Body() dto: UpdateTicketTypeDto,
    @CurrentUser() user: AuthenticatedActor,
  ) {
    return this.ticketsService.updateTicketType(id, dto, user);
  }

  @Delete('types/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete an unused ticket tier (Owner / Admin only)',
  })
  deleteType(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedActor,
  ) {
    return this.ticketsService.deleteTicketType(id, user);
  }

  @Get('types/event/:eventId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all ticket types for a specific event' })
  getTypesByEvent(
    @Param('eventId') eventId: string,
    @CurrentUser() user?: AuthenticatedActor | null,
  ) {
    return this.ticketsService.getTicketTypesByEvent(eventId, user);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all issued digital tickets belonging to the current user',
  })
  getMyTickets(@CurrentUser('id') userId: string) {
    return this.ticketsService.getMyTickets(userId);
  }

  @Get('scanner/events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER, Role.SCANNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List events the authenticated scanner/organizer is authorized to check in',
  })
  getScannerEvents(@CurrentUser() user: AuthenticatedActor) {
    return this.ticketsService.getAuthorizedScannerEvents(user);
  }

  @Get('validate')
  @ApiOperation({ summary: 'Ticket validation endpoint information' })
  getValidateInfo() {
    return {
      message:
        'To validate a ticket, send an authenticated POST request with ticketCode or QR payload.',
      method: 'POST',
      endpoint: '/api/v1/tickets/validate',
      example: {
        ticketCode: 'TKT-2026-VIP-001',
      },
    };
  }

  @Get(':code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get ticket details by code (Ticket owner, event organizer, assigned scanner, or admin)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ticket found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket not found' })
  getTicket(
    @Param('code') code: string,
    @CurrentUser() user: AuthenticatedActor,
  ) {
    return this.ticketsService.getTicketByCode(code, user);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER, Role.SCANNER)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Validate and check in a ticket atomically (Authorized Scanner / Organizer / Admin)',
    description:
      'Verifies event authorization and QR credential, enforces single-entry via atomic conditional update, marks USED, and records check-in actor and timestamp.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket validated successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Ticket already used',
  })
  validate(
    @Body() dto: ValidateTicketDto,
    @CurrentUser() user: AuthenticatedActor,
  ) {
    return this.ticketsService.validateTicket(dto, user);
  }
}
