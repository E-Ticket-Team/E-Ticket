import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  EventStatus,
  OrderStatus,
  Prisma,
  Role,
  TicketStatus,
} from '@prisma/client';
import { fromMinorUnits, toMinorUnits } from '../../common/utils/money.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminCreateUserDto,
  AdminQueryUsersDto,
  AdminUpdateUserDto,
} from './dto/admin-user.dto';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  organizationName: true,
  phoneNumber: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [
      totalUsers,
      usersByRole,
      eventCounts,
      tierStats,
      orders,
      ticketsByStatus,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
      this.prisma.event.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.ticketType.aggregate({
        _sum: {
          totalQuantity: true,
          remainingQuantity: true,
        },
      }),
      this.prisma.order.findMany({
        select: {
          status: true,
          totalAmount: true,
          paidAt: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.ticket.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    let paidOrders = 0;
    let pendingOrders = 0;
    let cancelledOrders = 0;
    let refundedOrders = 0;
    let expiredOrders = 0;
    let grossCents = 0;
    let refundedCents = 0;

    const salesByDay = new Map<
      string,
      { paidOrders: number; tickets: number; revenueCents: number }
    >();

    for (const o of orders) {
      const amountCents = toMinorUnits(o.totalAmount);
      if (o.status === OrderStatus.PAID) {
        paidOrders += 1;
        grossCents += amountCents;
        const dateKey = (o.paidAt ?? o.createdAt).toISOString().slice(0, 10);
        const cur = salesByDay.get(dateKey) ?? {
          paidOrders: 0,
          tickets: 0,
          revenueCents: 0,
        };
        cur.paidOrders += 1;
        cur.tickets += o.items.reduce((sum, i) => sum + i.quantity, 0);
        cur.revenueCents += amountCents;
        salesByDay.set(dateKey, cur);
      } else if (o.status === OrderStatus.REFUNDED) {
        refundedOrders += 1;
        grossCents += amountCents;
        refundedCents += amountCents;
      } else if (o.status === OrderStatus.PENDING) {
        pendingOrders += 1;
      } else if (o.status === OrderStatus.CANCELLED) {
        cancelledOrders += 1;
      } else if (o.status === OrderStatus.EXPIRED) {
        expiredOrders += 1;
      }
    }

    const roleCounts: Record<string, number> = {
      ADMIN: 0,
      ORGANIZER: 0,
      CUSTOMER: 0,
      SCANNER: 0,
    };
    for (const entry of usersByRole) {
      roleCounts[entry.role] = entry._count.role;
    }

    const eventByStatus: Record<string, number> = {
      PUBLISHED: 0,
      DRAFT: 0,
      CANCELLED: 0,
      COMPLETED: 0,
    };
    let totalEvents = 0;
    for (const entry of eventCounts) {
      eventByStatus[entry.status] = entry._count.status;
      totalEvents += entry._count.status;
    }

    const ticketStatusCounts: Record<string, number> = {
      VALID: 0,
      USED: 0,
      CANCELLED: 0,
    };
    let ticketsTotal = 0;
    for (const entry of ticketsByStatus) {
      ticketStatusCounts[entry.status] = entry._count.status;
      ticketsTotal += entry._count.status;
    }

    const totalCapacity = tierStats._sum.totalQuantity ?? 0;
    const remainingCapacity = tierStats._sum.remainingQuantity ?? 0;

    const salesOverTime = Array.from(salesByDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, stats]) => ({
        date,
        paidOrders: stats.paidOrders,
        tickets: stats.tickets,
        revenue: fromMinorUnits(stats.revenueCents),
      }));

    return {
      users: {
        total: totalUsers,
        byRole: roleCounts,
      },
      events: {
        total: totalEvents,
        published: eventByStatus.PUBLISHED,
        draft: eventByStatus.DRAFT,
        cancelled: eventByStatus.CANCELLED,
        completed: eventByStatus.COMPLETED,
        totalCapacity,
        remainingCapacity,
        soldCapacity: Math.max(0, totalCapacity - remainingCapacity),
      },
      orders: {
        total: orders.length,
        paid: paidOrders,
        pending: pendingOrders,
        cancelled: cancelledOrders,
        refunded: refundedOrders,
        expired: expiredOrders,
        grossVolume: fromMinorUnits(grossCents),
        netVolume: fromMinorUnits(Math.max(0, grossCents - refundedCents)),
      },
      tickets: {
        totalIssued: ticketsTotal,
        checkedIn: ticketStatusCounts.USED,
        valid: ticketStatusCounts.VALID,
        cancelled: ticketStatusCounts.CANCELLED,
      },
      salesOverTime,
    };
  }

  async listUsers(query: AdminQueryUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (query.role) {
      where.role = query.role;
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { organizationName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          ...SAFE_USER_SELECT,
          _count: {
            select: { events: true, orders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async updateUser(
    targetUserId: string,
    dto: AdminUpdateUserDto,
    actingAdminId: string,
  ) {
    if (targetUserId === actingAdminId) {
      if (dto.isActive === false) {
        throw new BadRequestException('Cannot suspend your own admin account');
      }
      if (dto.role && dto.role !== Role.ADMIN) {
        throw new BadRequestException('Cannot remove your own ADMIN role');
      }
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!existing) {
      throw new NotFoundException(`User with ID "${targetUserId}" not found`);
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        role: dto.role,
        isActive: dto.isActive,
      },
      select: SAFE_USER_SELECT,
    });
  }

  async createUser(dto: AdminCreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`A user with email "${email}" already exists`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email,
        password: passwordHash,
        firstName: dto.firstName?.trim() || null,
        lastName: dto.lastName?.trim() || null,
        organizationName: dto.organizationName?.trim() || null,
        phoneNumber: dto.phoneNumber?.trim() || null,
        role: dto.role,
        isActive: dto.isActive ?? true,
      },
      select: {
        ...SAFE_USER_SELECT,
        _count: {
          select: { events: true, orders: true },
        },
      },
    });
  }

  async listOrders(params: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    search?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { paymentReference: { contains: q, mode: 'insensitive' } },
        { guestEmail: { contains: q, mode: 'insensitive' } },
        { guestName: { contains: q, mode: 'insensitive' } },
        { guestPhone: { contains: q, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
        {
          items: {
            some: {
              ticketType: {
                event: {
                  title: { contains: q, mode: 'insensitive' },
                },
              },
            },
          },
        },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
          items: {
            include: {
              ticketType: {
                include: {
                  event: { select: { id: true, title: true } },
                },
              },
            },
          },
          _count: { select: { tickets: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: items.map(({ guestTokenHash: _hiddenGuestToken, ...rest }) => rest),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async listTickets(params: {
    page?: number;
    limit?: number;
    status?: TicketStatus;
    search?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TicketWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { ticketCode: { contains: q, mode: 'insensitive' } },
        { order: { guestEmail: { contains: q, mode: 'insensitive' } } },
        { order: { guestName: { contains: q, mode: 'insensitive' } } },
        {
          order: {
            user: { email: { contains: q, mode: 'insensitive' } },
          },
        },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        include: {
          ticketType: {
            include: {
              event: { select: { id: true, title: true } },
            },
          },
          order: {
            select: {
              id: true,
              status: true,
              guestName: true,
              guestEmail: true,
              guestPhone: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items: items.map(({ qrTokenHash: _hidden, ...rest }) => rest),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
