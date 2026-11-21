import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventStatus, Role, TicketStatus } from '@prisma/client';
import {
  parseTicketInput,
  signTicketCredential,
  verifySignedCredential,
} from '../../common/utils/qr-credential.util';
import { AuthenticatedActor } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketTypeDto, ValidateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
};

@Injectable()
export class TicketsService {
  private readonly qrSigningSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.qrSigningSecret =
      this.configService.get<string>('jwt.qrSigningSecret') ||
      this.configService.get<string>('jwt.secret') ||
      'eticket-qr-signing-secret-change-in-production-2026';
  }

  async createTicketType(
    dto: CreateTicketTypeDto,
    currentUser: AuthenticatedActor,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${dto.eventId}" not found`);
    }

    this.assertEventOwnership(event.organizerId, currentUser);

    return this.prisma.ticketType.create({
      data: {
        eventId: dto.eventId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        price: dto.price,
        totalQuantity: dto.totalQuantity,
        remainingQuantity: dto.totalQuantity,
      },
    });
  }

  async updateTicketType(
    id: string,
    dto: UpdateTicketTypeDto,
    currentUser: AuthenticatedActor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.ticketType.findUnique({
        where: { id },
        include: { event: true },
      });

      if (!existing) {
        throw new NotFoundException(`Ticket type with ID "${id}" not found`);
      }

      this.assertEventOwnership(existing.event.organizerId, currentUser);

      let nextRemaining = existing.remainingQuantity;
      if (dto.totalQuantity !== undefined) {
        const allocated = existing.totalQuantity - existing.remainingQuantity;
        if (dto.totalQuantity < allocated) {
          throw new BadRequestException(
            `Cannot reduce total quantity below already reserved or sold inventory (${allocated})`,
          );
        }
        nextRemaining = dto.totalQuantity - allocated;
      }

      return tx.ticketType.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description:
            dto.description !== undefined
              ? dto.description.trim() || null
              : undefined,
          price: dto.price,
          totalQuantity: dto.totalQuantity,
          remainingQuantity: nextRemaining,
        },
      });
    });
  }

  async deleteTicketType(id: string, currentUser: AuthenticatedActor) {
    const existing = await this.prisma.ticketType.findUnique({
      where: { id },
      include: {
        event: true,
        _count: {
          select: {
            orderItems: true,
            tickets: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Ticket type with ID "${id}" not found`);
    }

    this.assertEventOwnership(existing.event.organizerId, currentUser);

    if (existing._count.orderItems > 0 || existing._count.tickets > 0) {
      throw new ConflictException(
        'Cannot delete a ticket tier that already has orders or issued tickets',
      );
    }

    await this.prisma.ticketType.delete({ where: { id } });
  }

  async getTicketTypesByEvent(
    eventId: string,
    currentUser?: AuthenticatedActor | null,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, status: true, organizerId: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found`);
    }

    if (event.status === EventStatus.DRAFT) {
      const canView =
        currentUser?.role === Role.ADMIN ||
        (currentUser?.role === Role.ORGANIZER &&
          event.organizerId === currentUser.id);
      if (!canView) {
        throw new NotFoundException(`Event with ID "${eventId}" not found`);
      }
    }

    return this.prisma.ticketType.findMany({
      where: { eventId },
      orderBy: { price: 'asc' },
    });
  }

  async getMyTickets(userId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        order: { userId },
      },
      include: {
        ticketType: {
          include: {
            event: true,
          },
        },
        order: {
          include: {
            user: { select: SAFE_USER_SELECT },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((t) => this.sanitizeTicket(t));
  }

  async getAuthorizedScannerEvents(currentUser: AuthenticatedActor) {
    if (currentUser.role === Role.ADMIN) {
      return this.prisma.event.findMany({
        where: { status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] } },
        orderBy: { startDate: 'asc' },
        select: {
          id: true,
          title: true,
          venue: true,
          location: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      });
    }

    if (currentUser.role === Role.ORGANIZER) {
      return this.prisma.event.findMany({
        where: { organizerId: currentUser.id },
        orderBy: { startDate: 'asc' },
        select: {
          id: true,
          title: true,
          venue: true,
          location: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      });
    }

    const assignments = await this.prisma.eventScanner.findMany({
      where: { userId: currentUser.id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            venue: true,
            location: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
    });

    return assignments.map((a) => a.event);
  }

  async getTicketByCode(
    rawInput: string,
    currentUser: AuthenticatedActor,
  ) {
    const parsed = parseTicketInput(rawInput);

    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketCode: parsed.ticketCode },
      include: {
        ticketType: {
          include: {
            event: true,
          },
        },
        order: {
          include: {
            user: { select: SAFE_USER_SELECT },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(
        `Ticket with code "${parsed.ticketCode}" not found`,
      );
    }

    const isOwner = Boolean(
      ticket.order.userId && ticket.order.userId === currentUser.id,
    );
    const isAdmin = currentUser.role === Role.ADMIN;
    const isOwningOrganizer =
      currentUser.role === Role.ORGANIZER &&
      ticket.ticketType.event.organizerId === currentUser.id;

    let isAssignedScanner = false;
    if (currentUser.role === Role.SCANNER) {
      const assignment = await this.prisma.eventScanner.findUnique({
        where: {
          eventId_userId: {
            eventId: ticket.ticketType.eventId,
            userId: currentUser.id,
          },
        },
      });
      isAssignedScanner = Boolean(assignment);
    }

    if (!isOwner && !isAdmin && !isOwningOrganizer && !isAssignedScanner) {
      throw new ForbiddenException(
        'You do not have permission to view this ticket',
      );
    }

    return this.sanitizeTicket(ticket);
  }

  async validateTicket(
    dto: ValidateTicketDto,
    currentUser: AuthenticatedActor,
  ) {
    const parsed = parseTicketInput(dto.ticketCode);

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { ticketCode: parsed.ticketCode },
        include: {
          ticketType: {
            include: {
              event: true,
            },
          },
          order: {
            include: {
              user: { select: SAFE_USER_SELECT },
            },
          },
        },
      });

      if (!ticket) {
        throw new NotFoundException(
          `Ticket with code "${parsed.ticketCode}" was not found`,
        );
      }

      await this.assertScannerAuthorization(
        tx,
        ticket.ticketType.event,
        currentUser,
      );

      if (dto.eventId && dto.eventId !== ticket.ticketType.eventId) {
        throw new BadRequestException(
          'This ticket belongs to a different event than the selected gate event',
        );
      }

      if (parsed.isSignedToken) {
        const validToken = verifySignedCredential(
          parsed.rawCredential!,
          ticket.id,
          ticket.ticketCode,
          ticket.qrTokenHash,
          this.qrSigningSecret,
        );
        if (!validToken) {
          throw new BadRequestException(
            'Invalid or tampered QR ticket credential',
          );
        }
      }

      if (ticket.ticketType.event.status === EventStatus.CANCELLED) {
        throw new BadRequestException(
          'This event has been cancelled and tickets are no longer valid',
        );
      }

      if (ticket.status === TicketStatus.USED) {
        throw new ConflictException(
          `Ticket "${ticket.ticketCode}" has already been used on ${ticket.usedAt?.toISOString()}`,
        );
      }

      if (ticket.status === TicketStatus.CANCELLED) {
        throw new BadRequestException(
          `Ticket "${ticket.ticketCode}" has been cancelled and cannot be used`,
        );
      }

      const now = new Date();
      const updatedCount = await tx.ticket.updateMany({
        where: {
          id: ticket.id,
          status: TicketStatus.VALID,
        },
        data: {
          status: TicketStatus.USED,
          usedAt: now,
          checkedInById: currentUser.id,
        },
      });

      if (updatedCount.count !== 1) {
        throw new ConflictException(
          `Ticket "${ticket.ticketCode}" has already been used or invalidated`,
        );
      }

      const updated = await tx.ticket.findUniqueOrThrow({
        where: { id: ticket.id },
        include: {
          ticketType: {
            include: {
              event: true,
            },
          },
          order: {
            include: {
              user: { select: SAFE_USER_SELECT },
            },
          },
        },
      });

      return {
        valid: true,
        message: 'Ticket successfully verified and checked in',
        ticket: this.sanitizeTicket(updated),
      };
    });
  }

  /**
   * Computes the opaque QR payload for display without leaking `qrTokenHash`.
   */
  public buildQrPayload(ticket: {
    id: string;
    ticketCode: string;
    qrTokenHash?: string | null;
  }): string {
    if (ticket.qrTokenHash) {
      return signTicketCredential(
        ticket.id,
        ticket.ticketCode,
        this.qrSigningSecret,
      );
    }
    return ticket.ticketCode;
  }

  private sanitizeTicket<
    T extends {
      id: string;
      ticketCode: string;
      qrTokenHash?: string | null;
      order?: Record<string, any> | null;
    },
  >(ticket: T) {
    const { qrTokenHash: _hidden, order, ...rest } = ticket;
    let safeOrder = order;
    if (order && typeof order === 'object' && 'guestTokenHash' in order) {
      const { guestTokenHash: _hiddenGuestToken, ...restOrder } = order;
      safeOrder = restOrder;
    }
    return {
      ...rest,
      ...(safeOrder !== undefined ? { order: safeOrder } : {}),
      qrPayload: this.buildQrPayload(ticket),
    };
  }

  private assertEventOwnership(
    organizerId: string,
    actor: AuthenticatedActor,
  ) {
    if (actor.role !== Role.ADMIN && organizerId !== actor.id) {
      throw new ForbiddenException(
        'You do not have permission to manage ticket tiers for this event',
      );
    }
  }

  private async assertScannerAuthorization(
    tx: any,
    event: { id: string; organizerId: string },
    actor: AuthenticatedActor,
  ) {
    if (actor.role === Role.ADMIN) {
      return;
    }
    if (actor.role === Role.ORGANIZER && event.organizerId === actor.id) {
      return;
    }
    if (actor.role === Role.SCANNER) {
      const assignment = await tx.eventScanner.findUnique({
        where: {
          eventId_userId: {
            eventId: event.id,
            userId: actor.id,
          },
        },
      });
      if (assignment) {
        return;
      }
    }
    throw new ForbiddenException(
      'You are not authorized to validate tickets for this event',
    );
  }
}
