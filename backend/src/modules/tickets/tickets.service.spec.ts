import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { EventStatus, Role, TicketStatus } from '@prisma/client';
import {
  hashCredential,
  signTicketCredential,
} from '../../common/utils/qr-credential.util';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  let service: TicketsService;

  const qrSecret = 'test-qr-secret-unit';
  const organizerId = 'org-1';
  const eventId = 'ev-1';
  const ticketId = 'tkt-id-1';
  const ticketCode = 'TKT-AABBCC-112233';
  const signedToken = signTicketCredential(ticketId, ticketCode, qrSecret);
  const tokenHash = hashCredential(signedToken);

  const mockTx: any = {
    ticketType: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ticket: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
    eventScanner: {
      findUnique: jest.fn(),
    },
  };

  const mockPrisma: any = {
    event: { findUnique: jest.fn() },
    ticketType: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((cb: any) => cb(mockTx)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((k: string) =>
              k === 'jwt.qrSigningSecret' ? qrSecret : undefined,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    jest.clearAllMocks();
  });

  it('rejects reducing ticket tier totalQuantity below allocated inventory', async () => {
    mockTx.ticketType.findUnique.mockResolvedValue({
      id: 'tier-1',
      totalQuantity: 100,
      remainingQuantity: 40, // 60 already reserved/sold
      event: { id: eventId, organizerId },
    });

    await expect(
      service.updateTicketType(
        'tier-1',
        { totalQuantity: 50 },
        { id: organizerId, role: Role.ORGANIZER },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects deleting a ticket tier with existing orders or tickets', async () => {
    mockPrisma.ticketType.findUnique.mockResolvedValue({
      id: 'tier-1',
      event: { id: eventId, organizerId },
      _count: { orderItems: 1, tickets: 0 },
    });

    await expect(
      service.deleteTicketType('tier-1', { id: organizerId, role: Role.ORGANIZER }),
    ).rejects.toThrow(ConflictException);
  });

  it('validates a signed ETK1 QR token atomically for an authorized scanner', async () => {
    mockTx.ticket.findUnique.mockResolvedValue({
      id: ticketId,
      ticketCode,
      qrTokenHash: tokenHash,
      status: TicketStatus.VALID,
      ticketType: {
        eventId,
        event: { id: eventId, organizerId, status: EventStatus.PUBLISHED },
      },
      order: { user: { id: 'cust-1', email: 'c@e.com', firstName: 'A', lastName: 'B' } },
    });
    mockTx.eventScanner.findUnique.mockResolvedValue({ id: 'assign-1' });
    mockTx.ticket.updateMany.mockResolvedValue({ count: 1 });
    mockTx.ticket.findUniqueOrThrow.mockResolvedValue({
      id: ticketId,
      ticketCode,
      qrTokenHash: tokenHash,
      status: TicketStatus.USED,
      usedAt: new Date(),
      ticketType: { event: { id: eventId, title: 'Expo' } },
    });

    const result = await service.validateTicket(
      { ticketCode: signedToken },
      { id: 'scanner-1', role: Role.SCANNER },
    );

    expect(result.valid).toBe(true);
    expect(result.ticket.status).toBe(TicketStatus.USED);
    expect((result.ticket as any).qrTokenHash).toBeUndefined();
    expect(result.ticket.qrPayload).toBe(signedToken);
  });

  it('throws ConflictException when atomic updateMany matches 0 rows (simultaneous double scan)', async () => {
    mockTx.ticket.findUnique.mockResolvedValue({
      id: ticketId,
      ticketCode,
      qrTokenHash: tokenHash,
      status: TicketStatus.VALID,
      ticketType: {
        eventId,
        event: { id: eventId, organizerId, status: EventStatus.PUBLISHED },
      },
      order: { user: { id: 'cust-1' } },
    });
    mockTx.ticket.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.validateTicket(
        { ticketCode },
        { id: organizerId, role: Role.ORGANIZER },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects unauthorized scanner not assigned to the event', async () => {
    mockTx.ticket.findUnique.mockResolvedValue({
      id: ticketId,
      ticketCode,
      qrTokenHash: tokenHash,
      status: TicketStatus.VALID,
      ticketType: {
        eventId,
        event: { id: eventId, organizerId, status: EventStatus.PUBLISHED },
      },
      order: { user: { id: 'cust-1' } },
    });
    mockTx.eventScanner.findUnique.mockResolvedValue(null);

    await expect(
      service.validateTicket(
        { ticketCode },
        { id: 'unassigned-scanner', role: Role.SCANNER },
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
