import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EventStatus,
  OrderStatus,
  Prisma,
  Role,
  TicketStatus,
} from '@prisma/client';
import { fromMinorUnits, toMinorUnits } from '../../common/utils/money.util';
import { AuthenticatedActor } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignScannerDto } from './dto/assign-scanner.dto';

const SAFE_ATTENDEE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
};

@Injectable()
export class OrganizerService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(currentUser: AuthenticatedActor) {
    const eventFilter: Prisma.EventWhereInput =
      currentUser.role === Role.ADMIN
        ? {}
        : { organizerId: currentUser.id };

    const events = await this.prisma.event.findMany({
      where: eventFilter,
      include: {
        ticketTypes: {
          include: {
            tickets: {
              select: { id: true, status: true, createdAt: true },
            },
            orderItems: {
              include: {
                order: {
                  select: {
                    id: true,
                    status: true,
                    paidAt: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    let grossCents = 0;
    let refundedCents = 0;
    let ticketsSold = 0;
    let availableTickets = 0;
    let totalCheckIns = 0;
    const salesByDay = new Map<string, { tickets: number; revenueCents: number }>();

    const eventBreakdown = events.map((ev) => {
      let evTicketsSold = 0;
      let evCheckIns = 0;
      let evCapacity = 0;
      let evRemaining = 0;
      let evGrossCents = 0;
      let evRefundedCents = 0;

      for (const tier of ev.ticketTypes) {
        evCapacity += tier.totalQuantity;
        evRemaining += tier.remainingQuantity;
        if (ev.status === EventStatus.PUBLISHED) {
          availableTickets += tier.remainingQuantity;
        }

        for (const t of tier.tickets) {
          if (t.status !== TicketStatus.CANCELLED) {
            evTicketsSold += 1;
            ticketsSold += 1;
          }
          if (t.status === TicketStatus.USED) {
            evCheckIns += 1;
            totalCheckIns += 1;
          }
        }

        for (const item of tier.orderItems) {
          const itemCents = toMinorUnits(item.subtotal);
          if (item.order.status === OrderStatus.PAID) {
            evGrossCents += itemCents;
            grossCents += itemCents;
            const dateKey = (item.order.paidAt ?? item.order.createdAt)
              .toISOString()
              .slice(0, 10);
            const cur = salesByDay.get(dateKey) ?? { tickets: 0, revenueCents: 0 };
            cur.tickets += item.quantity;
            cur.revenueCents += itemCents;
            salesByDay.set(dateKey, cur);
          } else if (item.order.status === OrderStatus.REFUNDED) {
            evGrossCents += itemCents;
            evRefundedCents += itemCents;
            grossCents += itemCents;
            refundedCents += itemCents;
          }
        }
      }

      const evNetCents = Math.max(0, evGrossCents - evRefundedCents);

      return {
        eventId: ev.id,
        title: ev.title,
        status: ev.status,
        startDate: ev.startDate,
        venue: ev.venue,
        totalCapacity: evCapacity,
        remainingQuantity: evRemaining,
        ticketsSold: evTicketsSold,
        checkIns: evCheckIns,
        checkInRate:
          evTicketsSold > 0
            ? Math.round((evCheckIns / evTicketsSold) * 1000) / 10
            : 0,
        grossRevenue: fromMinorUnits(evGrossCents),
        refundedAmount: fromMinorUnits(evRefundedCents),
        netRevenue: fromMinorUnits(evNetCents),
      };
    });

    const netCents = Math.max(0, grossCents - refundedCents);
    const salesOverTime = Array.from(salesByDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        tickets: data.tickets,
        revenue: fromMinorUnits(data.revenueCents),
      }));

    return {
      summary: {
        totalEvents: events.length,
        publishedEvents: events.filter((e) => e.status === EventStatus.PUBLISHED).length,
        draftEvents: events.filter((e) => e.status === EventStatus.DRAFT).length,
        ticketsSold,
        availableTickets,
        grossRevenue: fromMinorUnits(grossCents),
        refundedAmount: fromMinorUnits(refundedCents),
        netRevenue: fromMinorUnits(netCents),
        totalCheckIns,
        checkInRate:
          ticketsSold > 0
            ? Math.round((totalCheckIns / ticketsSold) * 1000) / 10
            : 0,
      },
      revenuePolicy:
        'Gross revenue includes PAID and REFUNDED orders; refunded orders are deducted in Net Revenue and their cancelled tickets are excluded from Tickets Sold.',
      salesOverTime,
      eventBreakdown,
    };
  }

  async getEventAnalytics(eventId: string, currentUser: AuthenticatedActor) {
    const event = await this.assertEventAccess(eventId, currentUser);

    const full = await this.prisma.event.findUniqueOrThrow({
      where: { id: event.id },
      include: {
        ticketTypes: {
          orderBy: { price: 'asc' },
          include: {
            tickets: true,
            orderItems: {
              include: {
                order: {
                  select: { id: true, status: true, paidAt: true, createdAt: true },
                },
              },
            },
          },
        },
      },
    });

    let totalCapacity = 0;
    let remainingQuantity = 0;
    let ticketsSold = 0;
    let checkIns = 0;
    let grossCents = 0;
    let refundedCents = 0;
    const salesByDay = new Map<string, { tickets: number; revenueCents: number }>();

    const tierDistribution = full.ticketTypes.map((tier) => {
      totalCapacity += tier.totalQuantity;
      remainingQuantity += tier.remainingQuantity;

      let tierSold = 0;
      let tierCheckedIn = 0;
      let tierCancelled = 0;
      let tierGrossCents = 0;
      let tierRefundedCents = 0;

      for (const t of tier.tickets) {
        if (t.status === TicketStatus.CANCELLED) {
          tierCancelled += 1;
        } else {
          tierSold += 1;
          ticketsSold += 1;
        }
        if (t.status === TicketStatus.USED) {
          tierCheckedIn += 1;
          checkIns += 1;
        }
      }

      for (const item of tier.orderItems) {
        const sub = toMinorUnits(item.subtotal);
        if (item.order.status === OrderStatus.PAID) {
          tierGrossCents += sub;
          grossCents += sub;
          const dateKey = (item.order.paidAt ?? item.order.createdAt)
            .toISOString()
            .slice(0, 10);
          const cur = salesByDay.get(dateKey) ?? { tickets: 0, revenueCents: 0 };
          cur.tickets += item.quantity;
          cur.revenueCents += sub;
          salesByDay.set(dateKey, cur);
        } else if (item.order.status === OrderStatus.REFUNDED) {
          tierGrossCents += sub;
          tierRefundedCents += sub;
          grossCents += sub;
          refundedCents += sub;
        }
      }

      return {
        ticketTypeId: tier.id,
        name: tier.name,
        price: tier.price,
        totalQuantity: tier.totalQuantity,
        remainingQuantity: tier.remainingQuantity,
        soldCount: tierSold,
        checkedInCount: tierCheckedIn,
        cancelledCount: tierCancelled,
        netRevenue: fromMinorUnits(Math.max(0, tierGrossCents - tierRefundedCents)),
      };
    });

    const salesOverTime = Array.from(salesByDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        tickets: data.tickets,
        revenue: fromMinorUnits(data.revenueCents),
      }));

    return {
      event: {
        id: full.id,
        title: full.title,
        status: full.status,
        startDate: full.startDate,
        endDate: full.endDate,
        venue: full.venue,
      },
      summary: {
        totalCapacity,
        remainingQuantity,
        ticketsSold,
        checkIns,
        checkInRate:
          ticketsSold > 0
            ? Math.round((checkIns / ticketsSold) * 1000) / 10
            : 0,
        grossRevenue: fromMinorUnits(grossCents),
        refundedAmount: fromMinorUnits(refundedCents),
        netRevenue: fromMinorUnits(Math.max(0, grossCents - refundedCents)),
      },
      tierDistribution,
      salesOverTime,
    };
  }

  async getEventAttendees(
    eventId: string,
    currentUser: AuthenticatedActor,
    filters: { search?: string; ticketTypeId?: string; status?: TicketStatus },
  ) {
    await this.assertEventAccess(eventId, currentUser);

    const where: Prisma.TicketWhereInput = {
      ticketType: { eventId },
    };

    if (filters.ticketTypeId) {
      where.ticketTypeId = filters.ticketTypeId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { ticketCode: { contains: q, mode: 'insensitive' } },
        {
          order: {
            user: {
              OR: [
                { email: { contains: q, mode: 'insensitive' } },
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: {
        ticketType: {
          select: { id: true, name: true, price: true },
        },
        order: {
          select: {
            id: true,
            status: true,
            paymentReference: true,
            createdAt: true,
            paidAt: true,
            user: { select: SAFE_ATTENDEE_SELECT },
          },
        },
        checkedInBy: { select: SAFE_ATTENDEE_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map(({ qrTokenHash: _hidden, ...rest }) => rest);
  }

  async getEventCheckIns(eventId: string, currentUser: AuthenticatedActor) {
    await this.assertEventAccess(eventId, currentUser);

    const checkIns = await this.prisma.ticket.findMany({
      where: {
        ticketType: { eventId },
        status: TicketStatus.USED,
      },
      include: {
        ticketType: { select: { id: true, name: true } },
        order: {
          select: {
            id: true,
            user: { select: SAFE_ATTENDEE_SELECT },
          },
        },
        checkedInBy: { select: SAFE_ATTENDEE_SELECT },
      },
      orderBy: { usedAt: 'desc' },
    });

    return checkIns.map(({ qrTokenHash: _hidden, ...rest }) => rest);
  }

  async getOrganizerOrders(currentUser: AuthenticatedActor) {
    const eventFilter: Prisma.EventWhereInput =
      currentUser.role === Role.ADMIN ? {} : { organizerId: currentUser.id };

    const orders = await this.prisma.order.findMany({
      where: {
        items: {
          some: {
            ticketType: {
              event: eventFilter,
            },
          },
        },
      },
      include: {
        user: { select: SAFE_ATTENDEE_SELECT },
        items: {
          where: {
            ticketType: {
              event: eventFilter,
            },
          },
          include: {
            ticketType: {
              include: {
                event: {
                  select: { id: true, title: true },
                },
              },
            },
          },
        },
        _count: {
          select: { tickets: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return orders;
  }

  async getEventScanners(eventId: string, currentUser: AuthenticatedActor) {
    await this.assertEventAccess(eventId, currentUser);

    return this.prisma.eventScanner.findMany({
      where: { eventId },
      include: {
        user: { select: SAFE_ATTENDEE_SELECT },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async assignScanner(
    eventId: string,
    dto: AssignScannerDto,
    currentUser: AuthenticatedActor,
  ) {
    await this.assertEventAccess(eventId, currentUser);

    const scannerUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!scannerUser) {
      throw new NotFoundException(`No user found with email "${dto.email}"`);
    }

    if (scannerUser.role !== Role.SCANNER) {
      throw new BadRequestException(
        `User "${dto.email}" has role ${scannerUser.role}; only SCANNER accounts can be assigned to event gates`,
      );
    }

    if (!scannerUser.isActive) {
      throw new BadRequestException('Scanner account is currently suspended');
    }

    const existing = await this.prisma.eventScanner.findUnique({
      where: {
        eventId_userId: { eventId, userId: scannerUser.id },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Scanner "${dto.email}" is already assigned to this event`,
      );
    }

    return this.prisma.eventScanner.create({
      data: { eventId, userId: scannerUser.id },
      include: {
        user: { select: SAFE_ATTENDEE_SELECT },
      },
    });
  }

  async removeScanner(
    eventId: string,
    scannerUserId: string,
    currentUser: AuthenticatedActor,
  ) {
    await this.assertEventAccess(eventId, currentUser);

    const existing = await this.prisma.eventScanner.findUnique({
      where: {
        eventId_userId: { eventId, userId: scannerUserId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Scanner assignment not found');
    }

    await this.prisma.eventScanner.delete({
      where: { id: existing.id },
    });
  }

  private async assertEventAccess(
    eventId: string,
    currentUser: AuthenticatedActor,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found`);
    }
    if (
      currentUser.role !== Role.ADMIN &&
      event.organizerId !== currentUser.id
    ) {
      throw new ForbiddenException(
        'You do not have permission to access analytics or attendees for this event',
      );
    }
    return event;
  }
}
