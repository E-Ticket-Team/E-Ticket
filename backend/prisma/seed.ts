import {
  EventStatus,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  PrismaClient,
  Role,
  TicketStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  hashCredential,
  signTicketCredential,
} from '../src/common/utils/qr-credential.util';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with initial data...');

  const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);
  const qrSecret =
    process.env.QR_SIGNING_SECRET ||
    process.env.JWT_SECRET ||
    'eticket-qr-signing-secret-change-in-production-2026';

  const admin = await prisma.user.upsert({
    where: { email: 'admin@eticket.com' },
    update: {
      password: defaultPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      id: 'a0000000-0000-0000-0000-000000000000',
      email: 'admin@eticket.com',
      password: defaultPasswordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@eticket.com' },
    update: {
      password: defaultPasswordHash,
      organizationName: 'Cambodia Tech Events Ltd.',
      isActive: true,
    },
    create: {
      id: 'a0000000-0000-0000-0000-000000000001',
      email: 'organizer@eticket.com',
      password: defaultPasswordHash,
      firstName: 'Channthy',
      lastName: 'Tha',
      organizationName: 'Cambodia Tech Events Ltd.',
      phoneNumber: '+85598765432',
      role: Role.ORGANIZER,
      isActive: true,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@eticket.com' },
    update: {
      password: defaultPasswordHash,
      isActive: true,
    },
    create: {
      id: 'a0000000-0000-0000-0000-000000000002',
      email: 'customer@eticket.com',
      password: defaultPasswordHash,
      firstName: 'Sophea',
      lastName: 'Sreng',
      phoneNumber: '+85512345678',
      role: Role.CUSTOMER,
      isActive: true,
    },
  });

  const scanner = await prisma.user.upsert({
    where: { email: 'scanner@eticket.com' },
    update: {
      password: defaultPasswordHash,
      role: Role.SCANNER,
      isActive: true,
    },
    create: {
      id: 'a0000000-0000-0000-0000-000000000003',
      email: 'scanner@eticket.com',
      password: defaultPasswordHash,
      firstName: 'Phanet',
      lastName: 'GateStaff',
      phoneNumber: '+85511223344',
      role: Role.SCANNER,
      isActive: true,
    },
  });

  const event = await prisma.event.upsert({
    where: { id: 'b0000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'b0000000-0000-0000-0000-000000000001',
      title: 'Cambodia Tech Expo & Music Festival 2026',
      description:
        'Annual gathering of innovators, artists, and live musical performances.',
      category: 'Conference & Music',
      venue: 'Diamond Island Exhibition Center',
      location: 'Phnom Penh, Cambodia',
      startDate: new Date('2026-12-15T09:00:00Z'),
      endDate: new Date('2026-12-17T22:00:00Z'),
      status: EventStatus.PUBLISHED,
      organizerId: organizer.id,
    },
  });

  await prisma.eventScanner.upsert({
    where: {
      eventId_userId: { eventId: event.id, userId: scanner.id },
    },
    update: {},
    create: {
      eventId: event.id,
      userId: scanner.id,
    },
  });

  const vipTicketType = await prisma.ticketType.upsert({
    where: { id: 'c0000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'c0000000-0000-0000-0000-000000000001',
      eventId: event.id,
      name: 'VIP All-Access Pass',
      description:
        'Front-stage entry, keynote sessions, lounge access, and gift bag',
      price: 99.0,
      totalQuantity: 200,
      remainingQuantity: 199,
    },
  });

  await prisma.ticketType.upsert({
    where: { id: 'c0000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: 'c0000000-0000-0000-0000-000000000002',
      eventId: event.id,
      name: 'General Admission',
      description: 'Full-day access to exhibition hall and stages',
      price: 25.0,
      totalQuantity: 1000,
      remainingQuantity: 1000,
    },
  });

  const order = await prisma.order.upsert({
    where: { id: 'd0000000-0000-0000-0000-000000000001' },
    update: {
      paidAt: new Date('2026-11-15T08:00:00Z'),
    },
    create: {
      id: 'd0000000-0000-0000-0000-000000000001',
      userId: customer.id,
      totalAmount: 99.0,
      currency: 'USD',
      status: OrderStatus.PAID,
      paymentReference: 'MOCK-SEED-998822',
      paidAt: new Date('2026-11-15T08:00:00Z'),
    },
  });

  await prisma.orderItem.upsert({
    where: { id: 'f0000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'f0000000-0000-0000-0000-000000000001',
      orderId: order.id,
      ticketTypeId: vipTicketType.id,
      quantity: 1,
      unitPrice: 99.0,
      subtotal: 99.0,
    },
  });

  await prisma.payment.upsert({
    where: { idempotencyKey: 'seed-payment-001' },
    update: {},
    create: {
      orderId: order.id,
      provider: PaymentProvider.MOCK,
      amount: 99.0,
      currency: 'USD',
      status: PaymentStatus.SUCCEEDED,
      idempotencyKey: 'seed-payment-001',
      providerReference: 'MOCK-SEED-998822',
      paidAt: new Date('2026-11-15T08:00:00Z'),
      metadata: { isDevelopmentMock: true, seeded: true },
    },
  });

  const sampleTicketId = 'e0000000-0000-0000-0000-000000000001';
  const sampleTicketCode = 'TKT-2026-VIP-001';
  const qrPayload = signTicketCredential(
    sampleTicketId,
    sampleTicketCode,
    qrSecret,
  );
  const qrTokenHash = hashCredential(qrPayload);

  const ticket = await prisma.ticket.upsert({
    where: { ticketCode: sampleTicketCode },
    update: { qrTokenHash },
    create: {
      id: sampleTicketId,
      orderId: order.id,
      ticketTypeId: vipTicketType.id,
      ticketCode: sampleTicketCode,
      qrTokenHash,
      status: TicketStatus.VALID,
    },
  });

  console.log('Seeding completed successfully!');
  console.log(`Admin: ${admin.email} / Organizer: ${organizer.email}`);
  console.log(`Customer: ${customer.email} / Scanner: ${scanner.email}`);
  console.log(`Created sample event: ${event.title}`);
  console.log(`Created sample ticket code: ${ticket.ticketCode}`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
