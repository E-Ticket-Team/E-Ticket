import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { UpdateEventDto } from './dto/update-event.dto';

export interface AuthenticatedActor {
  id: string;
  role: Role;
}

const SAFE_ORGANIZER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  organizationName: true,
};

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto, organizerId: string) {
    const start = new Date(createEventDto.startDate);
    const end = new Date(createEventDto.endDate);
    this.validateDateRange(start, end);

    const { startDate: _s, endDate: _e, ...rest } = createEventDto;
    return this.prisma.event.create({
      data: {
        ...rest,
        startDate: start,
        endDate: end,
        organizerId,
      },
      include: {
        organizer: { select: SAFE_ORGANIZER_SELECT },
        ticketTypes: { orderBy: { price: 'asc' } },
      },
    });
  }

  async findAll(query: QueryEventsDto, currentUser?: AuthenticatedActor | null) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {};

    const isAdmin = currentUser?.role === Role.ADMIN;
    const isOrganizerMine =
      Boolean(query.mine) &&
      (currentUser?.role === Role.ORGANIZER || isAdmin);

    if (query.mine && !currentUser) {
      throw new ForbiddenException('Authentication required to list your events');
    }

    if (isOrganizerMine && !isAdmin) {
      where.organizerId = currentUser!.id;
    }

    if (isAdmin || isOrganizerMine) {
      if (query.status) {
        where.status = query.status;
      }
    } else {
      // Public and non-owner callers may only browse PUBLISHED or COMPLETED events
      if (query.status === EventStatus.COMPLETED) {
        where.status = EventStatus.COMPLETED;
      } else {
        where.status = EventStatus.PUBLISHED;
      }
    }

    if (query.category?.trim()) {
      where.category = {
        equals: query.category.trim(),
        mode: 'insensitive',
      };
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { venue: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (query.startAfter || query.endBefore) {
      where.startDate = {};
      if (query.startAfter) {
        where.startDate.gte = new Date(query.startAfter);
      }
      if (query.endBefore) {
        where.startDate.lte = new Date(query.endBefore);
      }
    }

    const sortBy = query.sortBy ?? 'startDate';
    const sortOrder = query.sortOrder ?? 'asc';

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        include: {
          organizer: { select: SAFE_ORGANIZER_SELECT },
          ticketTypes: { orderBy: { price: 'asc' } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
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

  async getCategories(): Promise<string[]> {
    const rows = await this.prisma.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        category: { not: null },
      },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return rows
      .map((r) => r.category?.trim())
      .filter((c): c is string => Boolean(c));
  }

  async findOne(id: string, currentUser?: AuthenticatedActor | null) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        organizer: { select: SAFE_ORGANIZER_SELECT },
        ticketTypes: { orderBy: { price: 'asc' } },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }

    if (event.status === EventStatus.DRAFT) {
      const canViewDraft =
        currentUser?.role === Role.ADMIN ||
        (currentUser?.role === Role.ORGANIZER &&
          event.organizerId === currentUser.id);
      if (!canViewDraft) {
        throw new NotFoundException(`Event with ID "${id}" not found`);
      }
    }

    return event;
  }

  async update(
    id: string,
    updateEventDto: UpdateEventDto,
    currentUser: AuthenticatedActor,
  ) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }

    this.assertOwnership(existing.organizerId, currentUser);

    const nextStart = updateEventDto.startDate
      ? new Date(updateEventDto.startDate)
      : existing.startDate;
    const nextEnd = updateEventDto.endDate
      ? new Date(updateEventDto.endDate)
      : existing.endDate;
    this.validateDateRange(nextStart, nextEnd);

    const { startDate: _s, endDate: _e, ...rest } = updateEventDto;
    const data: Prisma.EventUpdateInput = {
      ...rest,
      startDate: updateEventDto.startDate ? nextStart : undefined,
      endDate: updateEventDto.endDate ? nextEnd : undefined,
    };

    return this.prisma.event.update({
      where: { id },
      data,
      include: {
        organizer: { select: SAFE_ORGANIZER_SELECT },
        ticketTypes: { orderBy: { price: 'asc' } },
      },
    });
  }

  async remove(id: string, currentUser: AuthenticatedActor) {
    const existing = await this.prisma.event.findUnique({
      where: { id },
      include: {
        ticketTypes: {
          include: {
            _count: {
              select: {
                orderItems: true,
                tickets: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }

    this.assertOwnership(existing.organizerId, currentUser);

    const hasAssociatedActivity = existing.ticketTypes.some(
      (tier) => tier._count.orderItems > 0 || tier._count.tickets > 0,
    );

    if (hasAssociatedActivity) {
      throw new ConflictException(
        'Cannot delete an event with existing orders or issued tickets. Cancel the event instead.',
      );
    }

    return this.prisma.event.delete({
      where: { id },
    });
  }

  private assertOwnership(organizerId: string, actor: AuthenticatedActor) {
    if (actor.role !== Role.ADMIN && organizerId !== actor.id) {
      throw new ForbiddenException('You do not have permission to manage this event');
    }
  }

  private validateDateRange(start: Date, end: Date) {
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid start or end date');
    }
    if (end <= start) {
      throw new BadRequestException('End date must be after start date');
    }
  }
}
