# E-Ticket Backend API

NestJS 10 REST API for the Universal E-Ticketing Platform, featuring modular domain architecture, PostgreSQL integration via Prisma ORM 5, dual HttpOnly cookie + Bearer JWT authentication, Google OAuth 2.0 sign-in, atomic order reservations, idempotent payment settlement, HMAC-signed QR ticket passes, and Swagger OpenAPI documentation.

## Architecture & Directory Structure

```text
backend/
├── prisma/
│   ├── migrations/             # Versioned Prisma SQL migrations
│   ├── schema.prisma           # User, Event, TicketType, Order, OrderItem, Payment, Ticket, EventScanner
│   └── seed.ts                 # Idempotent seed script (4 role accounts, 6 events, tiers, order, ticket)
├── src/
│   ├── common/
│   │   ├── constants/          # Canonical UUID regex constant
│   │   ├── dto/                # Standard API response and error DTOs
│   │   ├── filters/            # Global AllExceptionsFilter and HttpExceptionFilter
│   │   ├── interceptors/       # LoggingInterceptor and TransformInterceptor
│   │   └── utils/              # money.util.ts (minor-unit math) & qr-credential.util.ts (ETK1 HMAC)
│   ├── config/
│   │   ├── configuration.ts    # Typed configuration loader
│   │   └── env.validation.ts   # Startup environment validation
│   ├── modules/
│   │   ├── admin/              # Platform overview, user/role management, global orders & tickets
│   │   ├── auth/               # Cookie/Bearer JWT auth, Google OAuth, RBAC guards & decorators
│   │   ├── events/             # Paginated discovery, category listing, owner-enforced CRUD
│   │   ├── health/             # GET /health database readiness & latency probe
│   │   ├── orders/             # Serializable reservations, guest checkout, expiration & refunds
│   │   ├── organizer/          # Revenue analytics, buyers list, attendees, check-ins & team scanners
│   │   ├── payments/           # PaymentProviderStrategy (MockPaymentProvider + KHQR stub) & webhook
│   │   ├── prisma/             # Global PrismaService & SELECT 1 health check
│   │   └── tickets/            # Ticket tier CRUD, my tickets, ETK1 inspection & atomic validation
│   ├── app.controller.ts       # GET / root info endpoint
│   ├── app.module.ts           # Root module (ConfigModule, ThrottlerGuard, domain modules)
│   └── main.ts                 # Bootstrap (Helmet, cookie-parser, CORS, ValidationPipe, Swagger)
├── test/
│   ├── app.e2e-spec.ts         # Self-contained Supertest E2E suite against PostgreSQL
│   └── jest-e2e.json
├── .env.example
├── Dockerfile
├── docker-entrypoint.sh
├── package.json
└── tsconfig.json
```

## Key Features

- **Security Middleware & Rate Limiting:** Configured with `helmet`, `cookie-parser`, credential-enabled CORS, global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), and `@nestjs/throttler` (`ThrottlerGuard`, 200 req/min global default plus tighter auth/payment/validation throttles).
- **Authentication & Google OAuth:**
  - `JwtStrategy` extracts tokens from either `HttpOnly` cookie (`eticket_access_token`) or `Authorization: Bearer <token>` and rejects inactive accounts (`isActive === false`).
  - Public registration (`POST /auth/register`, `/register/customer`, `/register/organization`) is restricted to `CUSTOMER` and `ORGANIZER`.
  - Google Sign-In (`POST /auth/google`, `GET /auth/google/config`) verifies ID tokens or OAuth2 access tokens via `google-auth-library`.
- **Atomic Orders & Guest Checkout:**
  - Supports authenticated buyers and guest buyers (`guestName`, `guestEmail`, optional `guestPhone`) via high-entropy `guestToken` (hashed with SHA-256 into `guestTokenHash`).
  - Runs inside `Serializable` Prisma transactions with `P2034` retry handling, integer minor-unit calculations (`toMinorUnits` / `fromMinorUnits`), conditional `remainingQuantity` decrements, and `inventoryReleased` single-release guards on expiration/cancellation/refund.
- **Payments & Signed QR Credentials:**
  - `MockPaymentProvider` simulates `SUCCEEDED` or `FAILED` payments for development/testing; `KHQRPaymentProvider` defines the NBC Bakong KHQR contract (`501 Not Implemented` until live credentials are added).
  - Supports `idempotencyKey` replay protection and HMAC-SHA256 verified webhooks (`x-webhook-signature`).
  - Issues non-sequential `TKT-XXXXXX-XXXXXX` codes and `ETK1.<ticketCode>.<sig>` QR credentials (persisting only SHA-256 `qrTokenHash`).
- **Atomic Gate Check-In & Team Scanners:**
  - `POST /api/v1/tickets/validate` authorizes `ADMIN`, the owning `ORGANIZER`, or an assigned `SCANNER` (`EventScanner`), validates `ETK1.` credentials when supplied, and executes an atomic `updateMany({ where: { id, status: 'VALID' } })` to reject duplicate/concurrent scans with `409 Conflict`.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `PORT` | HTTP server port | `4000` |
| `API_PREFIX` | Global route prefix (excludes `/` and `/health`) | `api/v1` |
| `CORS_ORIGIN` | Allowed origins (comma-separated URLs or `*`) | `*` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/eticket?schema=public` |
| `JWT_SECRET` | Secret key for signing JWTs | `eticket-jwt-secret-key-change-in-production-2026` |
| `JWT_EXPIRES_IN` | JWT & cookie lifetime (e.g. `7d`, `24h`) | `7d` |
| `QR_SIGNING_SECRET` | Secret for HMAC-SHA256 `ETK1.` QR tokens & payment webhooks | Falls back to `JWT_SECRET` |
| `COOKIE_SECURE` | Set `HttpOnly` cookie `secure` flag (`true` under HTTPS) | `false` |
| `ORDER_RESERVATION_MINUTES` | Pending order reservation TTL in minutes (min `1`) | `15` |
| `GOOGLE_CLIENT_ID` | Optional Google Cloud OAuth 2.0 Web Client ID | `""` (disabled) |

## Setup & Running Instructions

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Generate Prisma client and apply migrations
npx prisma generate
npx prisma migrate deploy   # Or `npx prisma db push`

# 4. Optional: Seed sample users, events, tiers, order, and ticket
npm run prisma:seed

# 5. Start server
npm run start:dev           # Development watch mode
npm run build && npm run start:prod  # Production build & run
```

## Testing

```bash
# Unit tests (Jest)
npm test

# End-to-end integration tests (requires running PostgreSQL)
npm run test:e2e
```

## REST API Overview

Interactive Swagger UI is served at `GET /api/docs`.

- **Root & Health:** `GET /`, `GET /health`
- **Auth (`/api/v1/auth`):** `POST /register/customer`, `POST /register/organization`, `POST /register`, `POST /login`, `GET /google/config`, `POST /google`, `POST /logout`, `GET /me`, `GET /profile`
- **Events (`/api/v1/events`):** `GET /categories`, `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`
- **Tickets (`/api/v1/tickets`):** `POST /types`, `PATCH /types/:id`, `DELETE /types/:id`, `GET /types/event/:eventId`, `GET /my`, `GET /scanner/events`, `GET /validate`, `GET /:code`, `POST /validate`
- **Orders (`/api/v1/orders`):** `POST /`, `GET /`, `GET /:id`, `POST /:id/cancel`
- **Payments (`/api/v1`):** `POST /orders/:id/payment`, `GET /orders/:id/payment`, `POST /payments/webhook`
- **Organizer (`/api/v1/organizer`):** `GET /dashboard`, `GET /orders`, `GET /events/:eventId/analytics`, `GET /events/:eventId/attendees`, `GET /events/:eventId/check-ins`, `GET/POST/DELETE /events/:eventId/scanners`, `GET/POST/DELETE /team`
- **Admin (`/api/v1/admin`):** `GET /overview`, `GET/POST /users`, `PATCH /users/:id`, `GET /orders`, `GET /tickets`
