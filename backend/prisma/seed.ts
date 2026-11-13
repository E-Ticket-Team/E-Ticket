import { PrismaClient, Role, EventStatus, TicketStatus, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with initial data...');

  // Create organizer
  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@eticket.com' },
    update: {},
    create: {
      id: 'a0000000-0000-0000-0000-000000000001',
      email: 'organizer@eticket.com',
      password: 'hashed_password_123',
      firstName: 'Channthy',
      lastName: 'Tha',
      role: Role.ORGANIZER,
    },
  });

  // Create customer
  const customer = await prisma.user.upsert({
    where: { email: 'customer@eticket.com' },
    update: {},
    create: {
      id: 'a0000000-0000-0000-0000-000000000002',
      email: 'customer@eticket.com',
      password: 'hashed_password_456',
      firstName: 'Sophea',
      lastName: 'Sreng',
      role: Role.CUSTOMER,
    },
  });

  // Create sample event
  const event = await prisma.event.upsert({
    where: { id: 'b0000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'b0000000-0000-0000-0000-000000000001',
      title: 'Cambodia Tech Expo & Music Festival 2026',
      description: 'Annual gathering of innovators, artists, and live musical performances.',
      category: 'Conference & Music',
      venue: 'Diamond Island Exhibition Center',
      location: 'Phnom Penh, Cambodia',
      startDate: new Date('2026-12-15T09:00:00Z'),
      endDate: new Date('2026-12-17T22:00:00Z'),
      status: EventStatus.PUBLISHED,
      organizerId: organizer.id,
    },
  });

  // Create sample ticket types
  const vipTicketType = await prisma.ticketType.upsert({
    where: { id: 'c0000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'c0000000-0000-0000-0000-000000000001',
      eventId: event.id,
      name: 'VIP All-Access Pass',
      description: 'Front-stage entry, keynote sessions, lounge access, and gift bag',
      price: 99.0,
      totalQuantity: 200,
      remainingQuantity: 199,
    },
  });

  const standardTicketType = await prisma.ticketType.upsert({
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

  // Create sample order
  const order = await prisma.order.upsert({
    where: { id: 'd0000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'd0000000-0000-0000-0000-000000000001',
      userId: customer.id,
      totalAmount: 99.0,
      status: OrderStatus.PAID,
      paymentReference: 'KHQR-REF-998822',
    },
  });

  // Create sample ticket
  const ticket = await prisma.ticket.upsert({
    where: { ticketCode: 'TKT-2026-VIP-001' },
    update: {},
    create: {
      id: 'e0000000-0000-0000-0000-000000000001',
      orderId: order.id,
      ticketTypeId: vipTicketType.id,
      ticketCode: 'TKT-2026-VIP-001',
      qrCode: 'data:image/svg+xml;utf8,<svg>mock-qr</svg>',
      status: TicketStatus.VALID,
    },
  });

  console.log('Seeding completed successfully!');
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
