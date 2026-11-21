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
    update: {
      bannerUrl: '/banners/tech-expo.jpg',
    },
    create: {
      id: 'b0000000-0000-0000-0000-000000000001',
      title: 'Cambodia Tech Expo & Music Festival 2026',
      description:
        'Annual gathering of innovators, artists, and live musical performances.',
      category: 'Conference & Music',
      venue: 'Diamond Island Exhibition Center',
      location: 'Phnom Penh, Cambodia',
      bannerUrl: '/banners/tech-expo.jpg',
      startDate: new Date('2026-12-15T09:00:00Z'),
      endDate: new Date('2026-12-17T22:00:00Z'),
      status: EventStatus.PUBLISHED,
      organizerId: organizer.id,
    },
  });

  const additionalEvents = [
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      title: 'Mekong Sunset Electronic Night',
      description:
        'Open-air riverside music showcase featuring live electronic sets, light installations, and twilight views along the Mekong.',
      category: 'Music & Nightlife',
      venue: 'Chaktomuk Riverfront Stage',
      location: 'Phnom Penh, Cambodia',
      bannerUrl: '/banners/mekong-music.jpg',
      startDate: new Date('2026-12-22T17:00:00Z'),
      endDate: new Date('2026-12-22T23:30:00Z'),
      tiers: [
        {
          id: 'c0000000-0000-0000-0000-000000000003',
          name: 'Early Bird Pass',
          description: 'General riverside terrace access from doors open',
          price: 18.0,
          totalQuantity: 450,
          remainingQuantity: 420,
        },
        {
          id: 'c0000000-0000-0000-0000-000000000004',
          name: 'VIP Sunset Deck',
          description: 'Elevated stage deck view, express lane, and 2 beverages',
          price: 55.0,
          totalQuantity: 100,
          remainingQuantity: 88,
        },
      ],
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      title: 'Angkor International Half Marathon',
      description:
        'Sunrise charity road race weaving past historic stone avenues and tropical jungle trails inside Angkor Archaeological Park.',
      category: 'Sports & Fitness',
      venue: 'Angkor Wat North Lawn',
      location: 'Siem Reap, Cambodia',
      bannerUrl: '/banners/angkor-marathon.jpg',
      startDate: new Date('2027-01-10T05:30:00Z'),
      endDate: new Date('2027-01-10T11:30:00Z'),
      tiers: [
        {
          id: 'c0000000-0000-0000-0000-000000000005',
          name: '21K Half Marathon Bib',
          description: 'Timing chip bib, official singlet, finisher medal, and hydration',
          price: 35.0,
          totalQuantity: 600,
          remainingQuantity: 540,
        },
        {
          id: 'c0000000-0000-0000-0000-000000000006',
          name: '10K Heritage Run',
          description: '10km scenic circuit entry, race kit, and finisher medal',
          price: 20.0,
          totalQuantity: 800,
          remainingQuantity: 765,
        },
      ],
    },
    {
      id: 'b0000000-0000-0000-0000-000000000004',
      title: 'Southeast Asia Product & Design Summit',
      description:
        'Full-day forum for founders, engineering leaders, and product designers exploring practical software craft across ASEAN.',
      category: 'Business & Design',
      venue: 'Sofitel Phnom Penh Auditorium',
      location: 'Phnom Penh, Cambodia',
      bannerUrl: '/banners/design-summit.jpg',
      startDate: new Date('2027-01-24T08:30:00Z'),
      endDate: new Date('2027-01-24T18:00:00Z'),
      tiers: [
        {
          id: 'c0000000-0000-0000-0000-000000000007',
          name: 'Conference Standard',
          description: 'Main auditorium talks, networking reception, and lunch',
          price: 79.0,
          totalQuantity: 300,
          remainingQuantity: 274,
        },
        {
          id: 'c0000000-0000-0000-0000-000000000008',
          name: 'Executive Workshop VIP',
          description: 'Reserved front rows plus afternoon systems workshop',
          price: 149.0,
          totalQuantity: 60,
          remainingQuantity: 52,
        },
      ],
    },
    {
      id: 'b0000000-0000-0000-0000-000000000005',
      title: 'Khmer Culinary & Heritage Cinema Night',
      description:
        'An evening of contemporary Cambodian tasting plates paired with a curated outdoor screening of restored independent shorts.',
      category: 'Food & Culture',
      venue: 'Sosoro Museum Courtyard',
      location: 'Phnom Penh, Cambodia',
      bannerUrl: '/banners/culinary-film.jpg',
      startDate: new Date('2027-02-06T18:00:00Z'),
      endDate: new Date('2027-02-06T22:00:00Z'),
      tiers: [
        {
          id: 'c0000000-0000-0000-0000-000000000009',
          name: 'Courtyard Tasting Pass',
          description: 'Five tasting stations plus outdoor courtyard cinema seat',
          price: 28.0,
          totalQuantity: 180,
          remainingQuantity: 162,
        },
        {
          id: 'c0000000-0000-0000-0000-000000000010',
          name: 'Chef Table Experience',
          description: 'Reserved linen dining table and director Q&A seating',
          price: 65.0,
          totalQuantity: 40,
          remainingQuantity: 34,
        },
      ],
    },
    {
      id: 'b0000000-0000-0000-0000-000000000006',
      title: 'Phnom Penh Stand-Up & Indie Live Special',
      description:
        'Intimate Saturday night showcase bringing regional stand-up comics and indie acoustic storytellers under one industrial roof.',
      category: 'Arts & Comedy',
      venue: 'Factory Phnom Penh Hall',
      location: 'Phnom Penh, Cambodia',
      bannerUrl: '/banners/comedy-live.jpg',
      startDate: new Date('2027-02-14T19:30:00Z'),
      endDate: new Date('2027-02-14T22:30:00Z'),
      tiers: [
        {
          id: 'c0000000-0000-0000-0000-000000000011',
          name: 'Standard Seating',
          description: 'Open general auditorium seating with welcome drink',
          price: 15.0,
          totalQuantity: 250,
          remainingQuantity: 215,
        },
        {
          id: 'c0000000-0000-0000-0000-000000000012',
          name: 'Front Stage Lounge',
          description: 'Priority front-two-row seats and backstage lounge entry',
          price: 32.0,
          totalQuantity: 50,
          remainingQuantity: 41,
        },
      ],
    },
  ];

  for (const item of additionalEvents) {
    const { tiers, ...eventFields } = item;
    const seededEvent = await prisma.event.upsert({
      where: { id: eventFields.id },
      update: {
        bannerUrl: eventFields.bannerUrl,
        startDate: eventFields.startDate,
        endDate: eventFields.endDate,
        status: EventStatus.PUBLISHED,
      },
      create: {
        ...eventFields,
        status: EventStatus.PUBLISHED,
        organizerId: organizer.id,
      },
    });

    await prisma.eventScanner.upsert({
      where: {
        eventId_userId: { eventId: seededEvent.id, userId: scanner.id },
      },
      update: {},
      create: {
        eventId: seededEvent.id,
        userId: scanner.id,
      },
    });

    for (const tier of tiers) {
      await prisma.ticketType.upsert({
        where: { id: tier.id },
        update: {},
        create: {
          ...tier,
          eventId: seededEvent.id,
        },
      });
    }
  }

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
