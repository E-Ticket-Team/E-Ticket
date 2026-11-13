import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketTypeDto, ValidateTicketDto } from './dto/create-ticket.dto';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('types')
  @ApiOperation({ summary: 'Create a new ticket tier / type for an event' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Ticket type created successfully',
  })
  createType(@Body() dto: CreateTicketTypeDto) {
    return this.ticketsService.createTicketType(dto);
  }

  @Get('types/event/:eventId')
  @ApiOperation({ summary: 'Get all ticket types for a specific event' })
  getTypesByEvent(@Param('eventId') eventId: string) {
    return this.ticketsService.getTicketTypesByEvent(eventId);
  }

  @Get('validate')
  @ApiOperation({ summary: 'Ticket validation endpoint information' })
  getValidateInfo() {
    return {
      message:
        'To validate a ticket, send a POST request with the ticketCode in JSON format.',
      method: 'POST',
      endpoint: '/api/v1/tickets/validate',
      example: {
        ticketCode: 'TKT-2026-VIP-001',
      },
    };
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get ticket details by ticket code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ticket found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket not found' })
  getTicket(@Param('code') code: string) {
    return this.ticketsService.getTicketByCode(code);
  }

  @Post('validate')
  @ApiOperation({
    summary: 'Validate and check in a ticket (QR scanner endpoint)',
    description:
      'Validates ticket code, ensures single entry, marks as USED, and records timestamp.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ticket validated successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Ticket already used',
  })
  validate(@Body() dto: ValidateTicketDto) {
    return this.ticketsService.validateTicket(dto);
  }
}

