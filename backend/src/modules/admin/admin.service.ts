import {
  BadRequestException,
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
import { PrismaService } from '../prisma/prisma.service';
import { AdminQueryUsersDto, AdminUpdateUserDto } from './dto/admin-user.dto';

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
      totalEvents,
      publishedEvents,
      orders,
      ticketsTotal,
      ticketsUsed,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
      this.prisma.event.count(),
      this.prisma.event.count({ where: { status: EventStatus.PUBLISHED } }),
      this.prisma.order.findMany({
        select: { status: true, totalAmount: true },
      }),
      this.prisma.ticket.count(),
      this.prisma.ticket.count({ where: { status: TicketStatus.USED } }),
    ]);

    let paidOrders = 0;
    let grossCents = 0;
    let refundedCents = 0;

    for (const o of orders) {
      const amountCents = toMinorUnits(o.totalAmount);
      if (o.status === OrderStatus.PAID) {
        paidOrders += 1;
        grossCents += amountCents;
      } else if (o.status === OrderStatus.REFUNDED) {
        grossCents += amountCents;
        refundedCents += amountCents;
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

    return {
      users: {
        total: totalUsers,
        byRole: roleCounts,
      },
      events: {
        total: totalEvents,
        published: publishedEvents,
      },
      orders: {
        total: orders.length,
        paid: paidOrders,
        grossVolume: fromMinorUnits(grossCents),
        netVolume: fromMinorUnits(Math.max(0, grossCents - refundedCents)),
      },
      tickets: {
        totalIssued: ticketsTotal,
        checkedIn: ticketsUsed,
      },
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

  async listOrders(params: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    if (params.status) {
      where.status = params.status;
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
      items,
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
