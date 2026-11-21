# Implementation Audit — Universal E-Ticketing Platform

**Audit Date:** 2026-11-21  
**Scope:** Full-stack inspection of `frontend/`, `backend/`, `infra/`, `docs/`, `docker-compose.yml`, and `.env.example` prior to Phase 2–8 upgrades.

---

## 1. Executive Baseline

The repository currently provides a running 3-tier containerized foundation (React 18 + Vite + Nginx, NestJS 10 + Prisma 5, PostgreSQL 16) with basic public event listing, event CRUD without auth enforcement, ticket tier creation, public ticket lookup with QR code rendering, manual/BarcodeDetector gate validation, JWT authentication endpoints, and `/health` monitoring.

### Baseline Automated Check Results (Observed Prior to Changes)
- **Backend unit tests (`npm test`):** 3 suites, 18 tests passed (`health.controller.spec.ts`, `auth.service.spec.ts`, `auth.controller.spec.ts`).
- **Backend E2E tests (`npm run test:e2e`):** 1 suite, 1 test passed (`app.e2e-spec.ts` -> `GET /health`).
- **Frontend TypeScript check (`npm run typecheck`):** Passed (`tsc -b --noEmit`).
- **Frontend tests / linter:** None configured in `frontend/package.json`.

---

## 2. Existing Features Inventory

### 2.1 Backend (`backend/`)
- **Global Pipeline (`src/main.ts`, `src/app.module.ts`):**
  - Prefix `api/v1` (excluding `/health` and `/`).
  - Swagger OpenAPI at `/api/docs` with `JWT-auth` Bearer security scheme.
  - Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`, `enableImplicitConversion`).
  - `TransformInterceptor` wrapping responses in `{ success: true, data, timestamp }` (skipping `/health`).
  - `AllExceptionsFilter` & `HttpExceptionFilter` formatting errors as `{ success: false, statusCode, error, message, timestamp, path, method }`.
  - `LoggingInterceptor` and `ConfigModule` (`env.validation.ts`).
- **Modules:**
  - `PrismaModule`: Global `PrismaService` with `checkHealth()` executing `SELECT 1`.
  - `HealthModule`: `GET /health` returning status, uptime, environment, version, and DB latency.
  - `AuthModule`: `POST /api/v1/auth/register/customer`, `POST /api/v1/auth/register/organization`, `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `GET /api/v1/auth/profile`. Includes `JwtStrategy`, `JwtAuthGuard`, `RolesGuard`, `@Public()`, `@Roles()`, `@CurrentUser()`.
  - `EventsModule`: `POST /api/v1/events`, `GET /api/v1/events` (`category`, `status` filters), `GET /api/v1/events/:id`, `PATCH /api/v1/events/:id`, `DELETE /api/v1/events/:id`.
  - `TicketsModule`: `POST /api/v1/tickets/types`, `GET /api/v1/tickets/types/event/:eventId`, `GET /api/v1/tickets/validate`, `GET /api/v1/tickets/:code`, `POST /api/v1/tickets/validate`.
- **Database Schema (`prisma/schema.prisma`):**
  - Models: `User`, `Event`, `TicketType`, `Order`, `Ticket`.
  - Enums: `Role` (`ADMIN`, `ORGANIZER`, `CUSTOMER`, `SCANNER`), `EventStatus` (`DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED`), `OrderStatus` (`PENDING`, `PAID`, `CANCELLED`, `REFUNDED`), `TicketStatus` (`VALID`, `USED`, `CANCELLED`).
  - Seed script (`prisma/seed.ts`): Seeds 1 organizer, 1 customer, 1 published event (`Cambodia Tech Expo & Music Festival 2026`), 2 ticket tiers, 1 paid order, and 1 valid ticket (`TKT-2026-VIP-001`).

### 2.2 Frontend (`frontend/`)
- **Stack:** React 18.3, TypeScript 5.6, Vite 6.0, `react-router-dom` 6.28, `lucide-react` 0.468, `qrcode.react` 4.1.
- **Styling (`src/index.css`):** Custom CSS design system (1,002 lines) using `:root` variables (`--bg-canvas: #f4f6fa`, `--bg-surface: #ffffff`, `--bg-dark: #0f172a`, `--brand-primary: #2563eb`, semantic status colors), `Plus Jakarta Sans` + `Inter` fonts, solid high-contrast surfaces.
- **Routes (`src/App.tsx`):** `/`, `/events`, `/events/:id`, `/tickets`, `/tickets/:code`, `/scanner`, `/organizer`, `/organizer/events/new`, `/organizer/events/:id/edit`, `/status`, `*`.
- **API Client (`src/services/api.ts`):** `fetch` wrapper unwrapping `{ success: true, data }` envelopes and throwing `ApiError`.

### 2.3 Infrastructure (`docker-compose.yml`, `frontend/nginx.conf`, `backend/Dockerfile`)
- Production Nginx container serves built SPA and proxies `/api/` and `/health` to `http://backend:4000`.
- `backend/docker-entrypoint.sh` currently executes `npx prisma db push --skip-generate`.

---

## 3. Critical Architectural & Security Risks Found

1. **Privilege Escalation in Public Registration (`RegisterDto` & `AuthService.register`):**
   - `POST /api/v1/auth/register` validates `role` against the full Prisma `Role` enum (`ADMIN`, `ORGANIZER`, `CUSTOMER`, `SCANNER`). Any unauthenticated user can currently self-register with `role: "ADMIN"` or `role: "SCANNER"`.
2. **Missing Auth & Ownership Enforcement on Events and Tickets:**
   - `EventsController` (`POST`, `PATCH`, `DELETE`) and `TicketsController` (`POST /types`, `POST /validate`, `GET /:code`) have no `JwtAuthGuard` or `RolesGuard`.
   - `CreateEventDto` trusts a client-supplied `organizerId` instead of deriving it from `@CurrentUser('id')`.
   - `GET /api/v1/events` returns `DRAFT` and `CANCELLED` events to unauthenticated callers.
   - `GET /api/v1/tickets/:code` leaks attendee name, email, and payment reference publicly without ownership/staff verification.
3. **Race Conditions in Ticket Validation (`TicketsService.validateTicket`):**
   - `validateTicket` performs a `findUnique` followed by `update` without an atomic conditional `updateMany({ where: { id, status: 'VALID' } })` inside a transaction, allowing concurrent double-scans to both succeed.
4. **Incomplete Purchasing & Inventory Lifecycle:**
   - No `OrdersModule`, `OrderItem` table, `PaymentsModule`, atomic inventory decrement, reservation expiration, or post-payment ticket issuance exists.
5. **Missing Scanner Assignment & Check-In Audit:**
   - No schema relationship associates `SCANNER` accounts with specific authorized events, nor does `Ticket` record which gate staff member performed check-in (`checkedInById`).
6. **Frontend Security & Functional Gaps:**
   - No `AuthContext`, login/register views, protected routes, or `HttpOnly` cookie / authenticated session transport.
   - `EventFormPage.tsx` hardcodes `DEFAULT_ORGANIZER_ID` in a user-editable field.
   - `ScannerPage.tsx` only supports `window.BarcodeDetector` (unsupported in Firefox/Safari) and has no event authorization selector.
   - No customer checkout flow, order history, or `/my-tickets` wallet; no organizer analytics/attendees dashboard; no `/admin` dashboard.
7. **Deployment & Repo Hygiene Gaps:**
   - `.env.example` contains unresolved git merge conflict markers (`<<<<<<< HEAD` ... `>>>>>>> origin/dev-channthy`) on lines 26–35.
   - `backend/prisma/migrations/` is absent (`db push` is used instead of versioned Prisma migrations).
   - `backend/src/main.ts` lacks `helmet`, rate limiting (`@nestjs/throttler`), cookie parser, and CORS credential support for cookie-based auth.

---

## 4. Target Architecture & Migration Plan (Phases 2–8)

### 4.1 Database Schema Extensions (`backend/prisma/schema.prisma`)
- Extend `OrderStatus` with `EXPIRED` (`PENDING | PAID | CANCELLED | REFUNDED | EXPIRED`).
- Add `PaymentProvider` (`MOCK | KHQR`) and `PaymentStatus` (`PENDING | SUCCEEDED | FAILED | REFUNDED`) enums.
- Add `OrderItem` (`order_items`): snapshots `ticketTypeId`, `quantity`, `unitPrice`, `subtotal` for `PENDING` reservations prior to ticket issuance.
- Update `Order` (`orders`): add `expiresAt`, `paidAt`, `cancelledAt`, `cancellationReason`, `inventoryReleased` (boolean guard preventing double inventory release), `items[]`, `payments[]`.
- Add `Payment` (`payments`): stores `provider`, `amount`, `currency`, `status`, `idempotencyKey` (unique), `providerReference` (unique), `failureReason`, `metadata`, `paidAt`.
- Update `Ticket` (`tickets`): add `qrTokenHash` (SHA-256 hash of HMAC-signed opaque credential `ETK1.<ticketCode>.<sig>`), `checkedInById` (FK -> `User`), and `eventId` index lookups via `ticketType`.
- Add `EventScanner` (`event_scanners`): links authorized `SCANNER` users to specific `Event` records (`@@unique([eventId, userId])`).
- Create a baseline + incremental Prisma migration under `backend/prisma/migrations/` and update `backend/docker-entrypoint.sh` to run `npx prisma migrate deploy`.

### 4.2 Backend Upgrade Plan
- **Phase 2:** Fix `.env.example`, add `helmet`, `cookie-parser`, `@nestjs/throttler`, dual `HttpOnly` cookie + `Bearer` JWT extraction (`POST /auth/logout` included), restrict public registration to `CUSTOMER`/`ORGANIZER`, enforce RBAC & ownership on `EventsController` and `TicketsController`, add server-side pagination/search/date filters/sorting on `GET /events`, and add `PATCH`/`DELETE` for ticket types (protecting issued inventory).
- **Phase 3:** Build `OrdersModule` (transactional `updateMany` inventory reservation, trusted DB pricing using integer minor units / cents to avoid JS float errors, configurable reservation TTL with atomic expiration cleanup, order listing/cancellation) and `PaymentsModule` (`PaymentProvider` interface + `MockPaymentProvider` + documented `KHQRPaymentProvider` stub, idempotent payment confirmation, atomic post-payment ticket issuance with CSPRNG `ticketCode` + HMAC-signed `ETK1.` QR token whose SHA-256 hash is stored in `qrTokenHash`).
- **Phase 4:** Harden `POST /tickets/validate` with atomic `updateMany({ where: { id, status: 'VALID' } })`, authorized scanner/organizer checks (`EventScanner` + `event.organizerId`), and `ETK1.` credential verification; build `OrganizerModule` (dashboard KPIs, sales/revenue analytics, attendee list, check-in logs, scanner assignment) and `AdminModule` (platform overview, user/organizer/event/order/ticket monitoring and user role/status controls).

### 4.3 Frontend Upgrade Plan
- **Phase 5:** Modularize shared UI primitives (`Button`, `Input`, `Select`, `Textarea`, `Modal`, `ConfirmDialog`, `Badge`, `Card`, `DataTable`, `Pagination`, `Skeleton`, `EmptyState`, `ErrorState`, `Toast`, `StatCard`, `PageHeader`, `Sidebar`, `Navbar`, `MobileDrawer`) preserving `src/index.css` design tokens; build `AuthContext`, `ProtectedRoute`, `RoleRoute`, and split API service modules (`auth`, `events`, `orders`, `payments`, `tickets`, `organizer`, `admin`).
- **Phase 6 & 7:** Implement `/login`, `/register`, `/register/organization`; upgrade `/` and `/events` (real backend pagination/filters/sorting); upgrade `/events/:id` (tier quantity selector + dynamic order summary + create order); build `/checkout/:orderId` (reservation countdown + mock payment verification + instant confirmation); build `/my-account` & `/my-tickets` (digital QR passes with print/download); upgrade `/organizer/*` (sidebar, KPIs, SVG/CSS real-data charts, event & tier CRUD without manual `organizerId`, attendees & check-in tables, scanner assignment); upgrade `/scanner` (event selector, `BarcodeDetector` + `jsqr` fallback, high-contrast validation states); build `/admin` dashboard; wire 100% to live backend APIs.
- **Phase 8:** Run full unit tests, E2E tests, frontend tests, typechecks, builds, Docker Compose clean build + migration + end-to-end verification, and write `docs/IMPLEMENTATION_REPORT.md`.
