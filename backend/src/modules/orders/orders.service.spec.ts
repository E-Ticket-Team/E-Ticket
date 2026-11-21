import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { EventStatus, OrderStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockTx: any = {
    ticketType: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  };

  const mockPrisma: any = {
    order: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn((cb: any) => cb(mockTx)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 15) },
        },
        {
          provide: TicketsService,
          useValue: { buildQrPayload: jest.fn((t) => t.ticketCode) },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.order.findFirst.mockResolvedValue(null);
  });

  it('rejects orders for non-published events', async () => {
    mockTx.ticketType.findMany.mockResolvedValue([
      {
        id: 'tier-1',
        name: 'VIP',
        price: '50.00',
        event: {
          title: 'Draft Event',
          status: EventStatus.DRAFT,
          endDate: new Date(Date.now() + 86400000),
        },
      },
    ]);

    await expect(
      service.createOrder('cust-1', {
        items: [{ ticketTypeId: 'tier-1', quantity: 1 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ConflictException when conditional inventory update returns count 0', async () => {
    mockTx.ticketType.findMany.mockResolvedValue([
      {
        id: 'tier-1',
        name: 'VIP',
        price: '50.00',
        event: {
          title: 'Live Event',
          status: EventStatus.PUBLISHED,
          endDate: new Date(Date.now() + 86400000),
        },
      },
    ]);
    mockTx.ticketType.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.createOrder('cust-1', {
        items: [{ ticketTypeId: 'tier-1', quantity: 5 }],
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('computes exact minor-unit totals when coalescing duplicate tier items', async () => {
    mockTx.ticketType.findMany.mockResolvedValue([
      {
        id: 'tier-1',
        name: 'Standard',
        price: '19.99',
        event: {
          title: 'Live Event',
          status: EventStatus.PUBLISHED,
          endDate: new Date(Date.now() + 86400000),
        },
      },
    ]);
    mockTx.ticketType.updateMany.mockResolvedValue({ count: 1 });
    mockTx.order.create.mockImplementation(async ({ data }: any) => ({
      id: 'ord-1',
      ...data,
      tickets: [],
    }));

    const order = await service.createOrder('cust-1', {
      items: [
        { ticketTypeId: 'tier-1', quantity: 1 },
        { ticketTypeId: 'tier-1', quantity: 2 },
      ],
    });

    expect(mockTx.ticketType.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tier-1', remainingQuantity: { gte: 3 } },
      }),
    );
    expect(order.totalAmount).toBe('59.97');
  });

  it('releases inventory atomically when cancelling a PENDING order', async () => {
    mockTx.order.findUnique.mockResolvedValue({
      id: 'ord-1',
      userId: 'cust-1',
      status: OrderStatus.PENDING,
      items: [{ ticketTypeId: 'tier-1', quantity: 2 }],
      tickets: [],
    });
    mockTx.order.updateMany.mockResolvedValue({ count: 1 });
    mockTx.order.findUniqueOrThrow.mockResolvedValue({
      id: 'ord-1',
      status: OrderStatus.CANCELLED,
      tickets: [],
    });

    const cancelled = await service.cancelOrder(
      'ord-1',
      { reason: 'Changed mind' },
      { id: 'cust-1', role: Role.CUSTOMER },
    );

    expect(cancelled.status).toBe(OrderStatus.CANCELLED);
    expect(mockTx.ticketType.update).toHaveBeenCalledWith({
      where: { id: 'tier-1' },
      data: { remainingQuantity: { increment: 2 } },
    });
  });
});
