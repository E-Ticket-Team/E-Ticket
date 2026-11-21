import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as cookieParser from 'cookie-parser';
import * as crypto from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('Universal E-Ticketing Platform (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueSuffix = Date.now().toString();
  const organizerEmail = `org-${uniqueSuffix}@eticket.com`;
  const customerEmail = `cust-${uniqueSuffix}@eticket.com`;
  const scannerEmail = `scan-${uniqueSuffix}@eticket.com`;
  const adminEmail = `admin-e2e-${uniqueSuffix}@eticket.com`;
  const guestBuyerEmail = `guest-${uniqueSuffix}@gmail.com`;
  const password = 'Password123!';

  let organizerToken: string;
  let organizerId: string;
  let customerToken: string;
  let customerCookie: string[];
  let scannerToken: string;
  let adminToken: string;

  let createdEventId: string;
  let vipTierId: string;
  let regularTierId: string;
  let orderId: string;
  let issuedTicketCode: string;
  let issuedQrPayload: string;
  let secondTicketCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1', { exclude: ['health', ''] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(),
    );

    await app.init();
    prisma = app.get(PrismaService);

    const hashedAdminPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedAdminPassword,
        firstName: 'E2E',
        lastName: 'Admin',
        role: Role.ADMIN,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    if (createdEventId) {
      await prisma.eventScanner.deleteMany({ where: { eventId: createdEventId } });
    }
    await prisma.ticket.deleteMany({
      where: {
        OR: [
          {
            order: {
              user: {
                email: { in: [customerEmail, organizerEmail, scannerEmail] },
              },
            },
          },
          {
            order: {
              guestEmail: guestBuyerEmail,
            },
          },
        ],
      },
    });
    await prisma.order.deleteMany({
      where: {
        OR: [
          { user: { email: { in: [customerEmail, organizerEmail] } } },
          { guestEmail: guestBuyerEmail },
        ],
      },
    });
    if (createdEventId) {
      await prisma.event.deleteMany({ where: { id: createdEventId } });
    }
    await prisma.user.deleteMany({
      where: {
        email: { in: [customerEmail, organizerEmail, scannerEmail, adminEmail] },
      },
    });
    await app.close();
  });

  it('/health (GET) should return 200 and healthy status', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.database.status).toBe('up');
      });
  });

  it('rejects self-registration as ADMIN or SCANNER', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `evil-${uniqueSuffix}@eticket.com`,
        password,
        role: 'ADMIN',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `evil2-${uniqueSuffix}@eticket.com`,
        password,
        role: 'SCANNER',
      })
      .expect(400);
  });

  it('registers & logs in organizer, customer, admin, and scanner', async () => {
    const orgReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register/organization')
      .send({
        email: organizerEmail,
        password,
        organizationName: 'E2E Live Events Co.',
        firstName: 'Org',
        lastName: 'Lead',
      })
      .expect(201);

    expect(orgReg.body.data.user.role).toBe('ORGANIZER');
    organizerId = orgReg.body.data.user.id;

    const orgLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: organizerEmail, password })
      .expect(200);
    organizerToken = orgLogin.body.data.accessToken;

    const custReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register/customer')
      .send({
        email: customerEmail,
        password,
        firstName: 'Test',
        lastName: 'Buyer',
      })
      .expect(201);
    expect(custReg.body.data.user.role).toBe('CUSTOMER');

    const custLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: customerEmail, password })
      .expect(200);
    customerToken = custLogin.body.data.accessToken;
    const rawSetCookie = custLogin.headers['set-cookie'];
    customerCookie = Array.isArray(rawSetCookie) ? rawSetCookie : [rawSetCookie];
    expect(customerCookie[0]).toBeDefined();

    // Verify HttpOnly cookie works on /auth/me without Authorization header
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', customerCookie)
      .expect(200)
      .expect((res) => {
        expect(res.body.data.email).toBe(customerEmail);
      });

    // Login as E2E admin to create/promote a dedicated E2E scanner account
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password })
      .expect(200);
    adminToken = adminLogin.body.data.accessToken;

    const scanUser = await request(app.getHttpServer())
      .post('/api/v1/auth/register/customer')
      .send({
        email: scannerEmail,
        password,
        firstName: 'Gate',
        lastName: 'Operator',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${scanUser.body.data.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'SCANNER' })
      .expect(200);

    const scanLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: scannerEmail, password })
      .expect(200);
    scannerToken = scanLogin.body.data.accessToken;
  });

  it('enforces RBAC on event creation, draft visibility, and tier setup', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/events')
      .send({
        title: 'Unauthenticated Event',
        venue: 'Nowhere',
        startDate: '2027-01-10T10:00:00Z',
        endDate: '2027-01-10T20:00:00Z',
      })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        title: 'Customer Forbidden Event',
        venue: 'Nowhere',
        startDate: '2027-01-10T10:00:00Z',
        endDate: '2027-01-10T20:00:00Z',
      })
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: `E2E Summit ${uniqueSuffix}`,
        description: 'Automated lifecycle verification summit',
        category: 'Technology',
        venue: 'Grand Arena',
        location: 'Phnom Penh',
        startDate: '2027-01-10T10:00:00Z',
        endDate: '2027-01-10T20:00:00Z',
        status: 'DRAFT',
      })
      .expect(201);

    createdEventId = created.body.data.id;
    expect(created.body.data.organizerId).toBe(organizerId);

    // Draft event must not be visible publicly
    await request(app.getHttpServer())
      .get(`/api/v1/events/${createdEventId}`)
      .expect(404);

    // Create VIP (qty 3) and Regular (qty 5) ticket types
    const vip = await request(app.getHttpServer())
      .post('/api/v1/tickets/types')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        eventId: createdEventId,
        name: 'VIP Pass',
        price: 50,
        totalQuantity: 3,
      })
      .expect(201);
    vipTierId = vip.body.data.id;

    const regular = await request(app.getHttpServer())
      .post('/api/v1/tickets/types')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        eventId: createdEventId,
        name: 'Regular Pass',
        price: 20,
        totalQuantity: 5,
      })
      .expect(201);
    regularTierId = regular.body.data.id;

    // Publish event
    await request(app.getHttpServer())
      .patch(`/api/v1/events/${createdEventId}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ status: 'PUBLISHED' })
      .expect(200);

    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/events?search=${uniqueSuffix}&page=1&limit=10`)
      .expect(200);
    expect(listRes.body.data.items.length).toBe(1);
    expect(listRes.body.data.meta.total).toBe(1);
  });

  it('handles atomic order creation, overselling rejection, mock payment, idempotency, and ticket issuance', async () => {
    // Attempt to buy more than available inventory (4 > 3 VIP)
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ ticketTypeId: vipTierId, quantity: 4 }] })
      .expect(409);

    // Reserve 2 VIP + 1 Regular = $120.00
    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [
          { ticketTypeId: vipTierId, quantity: 2 },
          { ticketTypeId: regularTierId, quantity: 1 },
        ],
      })
      .expect(201);

    orderId = orderRes.body.data.id;
    expect(orderRes.body.data.status).toBe('PENDING');
    expect(orderRes.body.data.totalAmount).toBe('120');

    // Simulate failed payment first (order stays PENDING, no tickets issued)
    const failedPay = await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider: 'MOCK',
        idempotencyKey: `idem-fail-${uniqueSuffix}`,
        simulateOutcome: 'FAILED',
      })
      .expect(200);

    expect(failedPay.body.data.payment.status).toBe('FAILED');
    expect(failedPay.body.data.order.status).toBe('PENDING');
    expect(failedPay.body.data.order.tickets.length).toBe(0);

    // Confirm payment with idempotency key
    const idemSuccess = `idem-ok-${uniqueSuffix}`;
    const payRes = await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider: 'MOCK',
        idempotencyKey: idemSuccess,
        simulateOutcome: 'SUCCEEDED',
      })
      .expect(200);

    expect(payRes.body.data.idempotentReplay).toBe(false);
    expect(payRes.body.data.order.status).toBe('PAID');
    expect(payRes.body.data.order.tickets.length).toBe(3);

    // Replay identical payment request -> must NOT duplicate tickets
    const replayRes = await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        provider: 'MOCK',
        idempotencyKey: idemSuccess,
        simulateOutcome: 'SUCCEEDED',
      })
      .expect(200);

    expect(replayRes.body.data.idempotentReplay).toBe(true);
    expect(replayRes.body.data.order.tickets.length).toBe(3);

    // Verify customer's My Tickets wallet
    const myTickets = await request(app.getHttpServer())
      .get('/api/v1/tickets/my')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const eventTickets = myTickets.body.data.filter(
      (t: any) => t.ticketType.eventId === createdEventId,
    );
    expect(eventTickets.length).toBe(3);
    issuedTicketCode = eventTickets[0].ticketCode;
    issuedQrPayload = eventTickets[0].qrPayload;
    secondTicketCode = eventTickets[1].ticketCode;
    expect(issuedQrPayload).toContain('ETK1.');
  });

  it('prevents overselling under concurrent requests and releases inventory on order cancel', async () => {
    // Only 1 VIP left; launch 2 concurrent orders requesting 1 VIP each
    const [r1, r2] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [{ ticketTypeId: vipTierId, quantity: 1 }] }),
      request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [{ ticketTypeId: vipTierId, quantity: 1 }] }),
    ]);

    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 409]);

    const winningOrderId = r1.status === 201 ? r1.body.data.id : r2.body.data.id;

    // Cancel pending order -> releases the 1 VIP back to inventory
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${winningOrderId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'E2E release test' })
      .expect(200);

    const tiers = await request(app.getHttpServer())
      .get(`/api/v1/tickets/types/event/${createdEventId}`)
      .expect(200);
    const vipAfter = tiers.body.data.find((t: any) => t.id === vipTierId);
    expect(vipAfter.remainingQuantity).toBe(1);
  });

  it('validates webhook signatures and rejects invalid signatures', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook')
      .send({
        orderId,
        provider: 'MOCK',
        idempotencyKey: `wh-${uniqueSuffix}`,
        providerReference: `WH-REF-${uniqueSuffix}`,
        status: 'SUCCEEDED',
      })
      .expect(401);

    const qrSecret =
      process.env.QR_SIGNING_SECRET ||
      process.env.JWT_SECRET ||
      'eticket-qr-signing-secret-change-in-production-2026';
    const providerReference = `WH-REF-${uniqueSuffix}`;
    const validSig = crypto
      .createHmac('sha256', qrSecret)
      .update(`${orderId}:${providerReference}:SUCCEEDED`)
      .digest('hex');

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook')
      .set('x-webhook-signature', validSig)
      .send({
        orderId,
        provider: 'MOCK',
        idempotencyKey: `wh-${uniqueSuffix}`,
        providerReference,
        status: 'SUCCEEDED',
      })
      .expect(200);
  });

  it('authorizes scanner, validates QR once, rejects duplicates & concurrent scans, and verifies organizer analytics', async () => {
    // Unassigned scanner must be rejected
    await request(app.getHttpServer())
      .post('/api/v1/tickets/validate')
      .set('Authorization', `Bearer ${scannerToken}`)
      .send({ ticketCode: issuedQrPayload })
      .expect(403);

    // Organizer assigns scanner to event
    await request(app.getHttpServer())
      .post(`/api/v1/organizer/events/${createdEventId}/scanners`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ email: scannerEmail })
      .expect(201);

    // Scanner checks in first ticket via signed ETK1 QR payload
    const firstScan = await request(app.getHttpServer())
      .post('/api/v1/tickets/validate')
      .set('Authorization', `Bearer ${scannerToken}`)
      .send({ ticketCode: issuedQrPayload, eventId: createdEventId })
      .expect(200);
    expect(firstScan.body.data.valid).toBe(true);
    expect(firstScan.body.data.ticket.status).toBe('USED');

    // Duplicate scan rejected with 409
    await request(app.getHttpServer())
      .post('/api/v1/tickets/validate')
      .set('Authorization', `Bearer ${scannerToken}`)
      .send({ ticketCode: issuedTicketCode })
      .expect(409);

    // Simultaneous double-scan on second ticket -> strictly one 200 and one 409
    const [s1, s2] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/tickets/validate')
        .set('Authorization', `Bearer ${scannerToken}`)
        .send({ ticketCode: secondTicketCode }),
      request(app.getHttpServer())
        .post('/api/v1/tickets/validate')
        .set('Authorization', `Bearer ${scannerToken}`)
        .send({ ticketCode: secondTicketCode }),
    ]);
    expect([s1.status, s2.status].sort()).toEqual([200, 409]);

    // Organizer analytics & attendees verification
    const analytics = await request(app.getHttpServer())
      .get(`/api/v1/organizer/events/${createdEventId}/analytics`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .expect(200);
    expect(analytics.body.data.summary.ticketsSold).toBe(3);
    expect(analytics.body.data.summary.checkIns).toBe(2);
    expect(analytics.body.data.summary.netRevenue).toBe('120.00');

    const attendees = await request(app.getHttpServer())
      .get(`/api/v1/organizer/events/${createdEventId}/attendees`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .expect(200);
    expect(attendees.body.data.length).toBe(3);

    // Customer denied organizer & admin endpoints
    await request(app.getHttpServer())
      .get('/api/v1/organizer/dashboard')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('allows guest buyers to reserve, pay, and receive QR passes without logging in while enforcing guest token access', async () => {
    // Reject guest order missing guestEmail/guestName
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({ items: [{ ticketTypeId: regularTierId, quantity: 1 }] })
      .expect(400);

    // Reserve ticket as guest (no JWT / cookie)
    const guestOrderRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({
        items: [{ ticketTypeId: regularTierId, quantity: 1 }],
        guestName: 'Guest Visitor',
        guestEmail: guestBuyerEmail,
      })
      .expect(201);

    const guestOrderId = guestOrderRes.body.data.id;
    const guestToken = guestOrderRes.body.data.guestToken;
    expect(guestToken).toBeTruthy();
    expect(guestOrderRes.body.data.guestTokenHash).toBeUndefined();

    // Reject unauthenticated order lookup without token
    await request(app.getHttpServer())
      .get(`/api/v1/orders/${guestOrderId}`)
      .expect(401);

    // Complete payment as guest with x-guest-token
    const payRes = await request(app.getHttpServer())
      .post(`/api/v1/orders/${guestOrderId}/payment`)
      .set('x-guest-token', guestToken)
      .send({
        provider: 'MOCK',
        idempotencyKey: `guest-pay-${uniqueSuffix}`,
        simulateOutcome: 'SUCCEEDED',
      })
      .expect(200);

    expect(payRes.body.data.order.status).toBe('PAID');
    expect(payRes.body.data.order.tickets).toHaveLength(1);
    expect(payRes.body.data.order.tickets[0].qrPayload).toMatch(/^ETK1\./);

    // Deterministic non-UUIDv4 tier IDs also pass DTO validation (self-contained for empty CI DBs)
    const deterministicTierId = `c0000000-0000-0000-0000-${uniqueSuffix
      .slice(-12)
      .padStart(12, '0')}`;
    await prisma.ticketType.create({
      data: {
        id: deterministicTierId,
        eventId: createdEventId,
        name: 'Deterministic Non-V4 UUID Tier',
        price: 15,
        totalQuantity: 10,
        remainingQuantity: 10,
      },
    });
    const seededOrderRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({
        items: [{ ticketTypeId: deterministicTierId, quantity: 1 }],
        guestName: 'Seeded Buyer',
        guestEmail: guestBuyerEmail,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/orders/${seededOrderRes.body.data.id}/cancel`)
      .set('x-guest-token', seededOrderRes.body.data.guestToken)
      .send({ reason: 'E2E cleanup' })
      .expect(200);
  });
});
