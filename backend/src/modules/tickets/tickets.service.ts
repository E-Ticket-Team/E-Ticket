import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketTypeDto, ValidateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicketType(dto: CreateTicketTypeDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${dto.eventId}" not found`);
    }

    return this.prisma.ticketType.create({
      data: {
        eventId: dto.eventId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        totalQuantity: dto.totalQuantity,
        remainingQuantity: dto.totalQuantity,
      },
    });
  }

  async getTicketTypesByEvent(eventId: string) {
    return this.prisma.ticketType.findMany({
      where: { eventId },
    });
  }

  async getTicketByCode(ticketCode: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketCode },
      include: {
        ticketType: {
          include: {
            event: true,
          },
        },
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with code "${ticketCode}" not found`);
    }

    return ticket;
  }

  async validateTicket(dto: ValidateTicketDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketCode: dto.ticketCode },
      include: {
        ticketType: {
          include: {
            event: true,
          },
        },
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(
        `Ticket with code "${dto.ticketCode}" was not found`,
      );
    }

    if (ticket.status === 'USED') {
      throw new ConflictException(
        `Ticket "${dto.ticketCode}" has already been used on ${ticket.usedAt?.toISOString()}`,
      );
    }

    if (ticket.status === 'CANCELLED') {
      throw new BadRequestException(
        `Ticket "${dto.ticketCode}" has been cancelled and cannot be used`,
      );
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'USED',
        usedAt: new Date(),
      },
      include: {
        ticketType: {
          include: {
            event: true,
          },
        },
      },
    });

    return {
      valid: true,
      message: 'Ticket successfully verified and checked in',
      ticket: updated,
    };
  }
}

