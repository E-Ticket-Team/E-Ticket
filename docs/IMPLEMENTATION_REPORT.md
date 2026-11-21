# Implementation Report — Universal E-Ticketing Platform

**Completion Date:** 2026-11-21  
**Baseline Audit:** [IMPLEMENTATION_AUDIT.md](./IMPLEMENTATION_AUDIT.md)

---

## 1. Executive Summary

The **Universal E-Ticketing Platform** has been upgraded across the database, NestJS REST API, React + Vite frontend, and Docker Compose deployment stack into a full-lifecycle ticketing system with:

- Role-based access control (`ADMIN`, `ORGANIZER`, `CUSTOMER`, `SCANNER`) and `HttpOnly` cookie + Bearer JWT authentication.
- Atomic inventory reservations (`Serializable` transaction + conditional `updateMany`), configurable reservation expiration with single-release guards, and integer minor-unit monetary calculations (`money.util.ts`).
- Idempotent payment processing via a `PaymentProviderStrategy` abstraction (`MockPaymentProvider` for development/QA + documented `KHQRPaymentProvider` contract) and HMAC-verified payment webhooks.
- Post-payment issuance of unique non-sequential `ticketCode` values and HMAC-SHA256 signed `ETK1.` QR credentials (storing only `qrTokenHash` in PostgreSQL).
- Atomic single-entry gate check-in validation (`updateMany` where `status = 'VALID'`) with event scanner authorization (`EventScanner`).
- Real-data Organizer analytics/attendees/check-ins studio, Customer checkout & digital QR ticket wallet, Mobile-first camera QR scanner (`BarcodeDetector` + `jsqr` fallback), and Admin platform console.

---

## 2. Implementation Status Matrix

| Capability | Status | Notes |
|---|---|---|
| HttpOnly cookie + Bearer JWT auth, logout, RBAC (`ADMIN`, `ORGANIZER`, `CUSTOMER`, `SCANNER`) | **Fully Implemented** | Public registration restricted strictly to `CUSTOMER` and `ORGANIZER` |
| Event CRUD, ownership enforcement, search, category/date/status filters, sorting & pagination | **Fully Implemented** | `DRAFT` events hidden from public discovery and detail endpoints |
| Ticket tier CRUD (`POST`, `PATCH`, `DELETE`) with inventory floor checks | **Fully Implemented** | Rejects reducing `totalQuantity` below reserved/sold inventory |
| Atomic order reservation, coalescing, cancel/refund & expiration release | **Fully Implemented** | Uses `Serializable` transactions + `inventoryReleased` guard |
| Payment abstraction, `MockPaymentProvider`, idempotency keys & HMAC webhook | **Fully Implemented (Dev Mock)** | `MockPaymentProvider` is explicitly marked development-only |
| Bakong KHQR live banking integration | **Requires External Provider Credentials** | `KHQRPaymentProvider` throws `501 Not Implemented` until NBC Bakong merchant credentials are supplied |
| Post-payment ticket issuance & `ETK1.` signed QR credentials | **Fully Implemented** | Stores SHA-256 `qrTokenHash` only; re-derives credential for owner display |
| Atomic gate ticket validation & scanner assignment (`EventScanner`) | **Fully Implemented** | Rejects duplicate & concurrent scans with `409 Conflict` |
| Organizer analytics, revenue breakdown, attendees & check-in logs | **Fully Implemented** | Real PostgreSQL aggregations with documented gross/refunded/net policy |
| Admin overview, user role/status management, order & ticket monitoring | **Fully Implemented** | Prevents self-demotion or self-suspension |
| Frontend UI (Auth, Discovery, Event Checkout, Ticket Wallet, Organizer, Scanner, Admin) | **Fully Implemented** | Preserves custom CSS design system (`index.css`) with mobile drawer, skeletons, toasts, and print support |
| Separate ESLint CLI configuration | **Not Implemented** | Strict TypeScript checks (`tsc -b --noEmit`) and NestJS builds run instead |

---

## 3. Architecture Changes

### 3.1 Database Schema & Migrations (`backend/prisma/`)
- **Migration Created:** `backend/prisma/migrations/20261121154357_upgrade_ticketing_lifecycle/migration.sql`
- **Container Startup (`backend/docker-entrypoint.sh`):** Updated to execute `npx prisma migrate deploy` when `prisma/migrations` is present.
- **Schema Updates (`backend/prisma/schema.prisma`):**
  - Added `EXPIRED` to `OrderStatus`; added `PaymentProvider` (`MOCK`, `KHQR`) and `PaymentStatus` (`PENDING`, `SUCCEEDED`, `FAILED`, `REFUNDED`).
  - `User`: added `isActive` (`Boolean @default(true)`), `scannerAssignments`, and `checkedInTickets`.
  - `Order`: added `currency`, `expiresAt`, `paidAt`, `cancelledAt`, `cancellationReason`, `inventoryReleased` (`Boolean @default(false)`), `items`, and `payments`.
  - Added `OrderItem` (`order_items`) to snapshot `unitPrice`, `quantity`, and `subtotal` during `PENDING` reservations prior to ticket issuance.
  - Added `Payment` (`payments`) with unique `idempotencyKey` and `providerReference`.
  - `Ticket`: added unique `qrTokenHash` and `checkedInById` FK.
  - Added `EventScanner` (`event_scanners`) with `@@unique([eventId, userId])`.
  - Added indexes on `events`, `ticket_types`, `orders`, `order_items`, `payments`, `tickets`, and `event_scanners`.
- **Inventory Semantics:** `TicketType.remainingQuantity` represents unreserved, unsold capacity (`totalQuantity` minus active `PENDING` reservations minus active `PAID` tickets). Cancelling or expiring a `PENDING` order atomically increments `remainingQuantity` once via `inventoryReleased` conditional claiming.

### 3.2 Backend Modules Completed (`backend/src/`)
- **`AuthModule` (`modules/auth/`):**
  - `RegisterDto` restricts public `role` values to `CUSTOMER` or `ORGANIZER` (`PublicRegistrationRole`), closing self-assigned `ADMIN`/`SCANNER` escalation.
  - `JwtStrategy` accepts JWTs from either `HttpOnly` cookie (`eticket_access_token`) or `Authorization: Bearer <token>` and rejects suspended accounts (`isActive === false`).
  - Added `OptionalJwtAuthGuard` for mixed public/owner event visibility and `POST /api/v1/auth/logout`.
- **`EventsModule` (`modules/events/`):**
  - Removed `organizerId` from `CreateEventDto`; owner is derived from `@CurrentUser()`.
  - Added `QueryEventsDto` (pagination, search, category, status, date bounds, sorting, `mine` filter) and `GET /api/v1/events/categories`.
  - Enforces ownership on `PATCH`/`DELETE` and blocks deletion when orders or tickets exist.
- **`OrdersModule` (`modules/orders/`):**
  - `POST /api/v1/orders`, `GET /api/v1/orders`, `GET /api/v1/orders/:id`, `POST /api/v1/orders/:id/cancel`.
  - Uses `money.util.ts` integer minor-unit calculations and `Serializable` transactions with `P2034` retry handling.
- **`PaymentsModule` (`modules/payments/`):**
  - `POST /api/v1/orders/:id/payment`, `GET /api/v1/orders/:id/payment`, `POST /api/v1/payments/webhook`.
  - `MockPaymentProvider` (`MOCK`), `KHQRPaymentProvider` (`KHQR`), idempotency key replay protection, HMAC webhook signature check, and post-payment ticket issuance (`generateTicketCode`, `signTicketCredential`, `hashCredential`).
- **`TicketsModule` (`modules/tickets/`):**
  - Added `PATCH /api/v1/tickets/types/:id`, `DELETE /api/v1/tickets/types/:id`, `GET /api/v1/tickets/my`, and `GET /api/v1/tickets/scanner/events`.
  - Protected `GET /api/v1/tickets/:code` (owner, event organizer, assigned scanner, or admin only).
  - Hardened `POST /api/v1/tickets/validate` with event authorization checks, `ETK1.` signature + hash verification, and atomic conditional `updateMany({ where: { id, status: 'VALID' } })`.
- **`OrganizerModule` (`modules/organizer/`):**
  - `GET /api/v1/organizer/dashboard`, `GET /api/v1/organizer/orders`, `GET /api/v1/organizer/events/:eventId/analytics`, `GET /api/v1/organizer/events/:eventId/attendees`, `GET /api/v1/organizer/events/:eventId/check-ins`, plus `GET`/`POST`/`DELETE /api/v1/organizer/events/:eventId/scanners`.
- **`AdminModule` (`modules/admin/`):**
  - `GET /api/v1/admin/overview`, `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id`, `GET /api/v1/admin/orders`, `GET /api/v1/admin/tickets`.

### 3.3 Security Hardening (`backend/src/main.ts`, `app.module.ts`)
- Enabled `helmet`, `cookie-parser`, CORS `credentials: true`, and global/route rate limiting via `@nestjs/throttler` (`ThrottlerGuard`).
- Removed `.env.example` merge conflict markers and documented environment variables.

### 3.4 Frontend Pages & Shared Architecture (`frontend/src/`)
- **Core Infrastructure:** `AuthContext.tsx`, `ToastContext.tsx`, `ProtectedRoute.tsx`, modular services (`api.ts`, `auth.service.ts`, `events.service.ts`, `orders.service.ts`, `payments.service.ts`, `tickets.service.ts`, `organizer.service.ts`, `admin.service.ts`), and `Asia/Phnom_Penh` date presentation in `utils/format.ts`.
- **Shared Components:** `Navbar` (role-aware + mobile drawer), `Pagination`, `Skeleton` (`EventCardSkeletonGrid`), `StatCard`, `PageHeader`, `QuantitySelector`, `CameraScanner` (`BarcodeDetector` + `jsqr`), `AnalyticsChart`, `OrganizerSidebar`, `TicketPassCard` (QR SVG download + print stylesheet).
- **Routes Implemented (`App.tsx`):**
  - Public: `/`, `/events`, `/events/:id`, `/login`, `/register`, `/register/organization`, `/status`.
  - Customer: `/my-account`, `/my-tickets`, `/checkout/:orderId`, `/tickets`, `/tickets/:code`.
  - Gate Staff: `/scanner`.
  - Organizer: `/organizer`, `/organizer/events`, `/organizer/events/new`, `/organizer/events/:id/edit`, `/organizer/orders`, `/organizer/attendees`, `/organizer/check-ins`.
  - Admin: `/admin`.

---

## 4. Verification & Test Results

All checks below were executed after the final code edit against the clean Docker Compose PostgreSQL database:

| Check | Command | Observed Result |
|---|---|---|
| Backend Unit Tests | `cd backend && npm test` | **7 suites, 34 tests passed** (`money.util`, `qr-credential.util`, `health.controller`, `tickets.service`, `orders.service`, `auth.controller`, `auth.service`) |
| Backend E2E Tests | `cd backend && npm run test:e2e` | **1 suite, 8 tests passed** (health, privilege escalation block, cookie auth, RBAC event/tier flow, overselling & concurrent order race, mock payment & idempotency, order cancel inventory release, webhook HMAC verification, scanner authorization & simultaneous double-scan rejection, organizer analytics, admin overview) |
| Backend Production Build | `cd backend && npm run build` | Passed (`nest build` exit code 0) |
| Frontend TypeScript Check | `cd frontend && npm run typecheck` | Passed (`tsc -b --noEmit` exit code 0) |
| Frontend Component Tests | `cd frontend && npm test` | **1 file, 7 tests passed** (`QuantitySelector`, `StatusBadge`, `Navbar`, `ProtectedRoute`, `TicketPassCard`, `LoginPage`) |
| Frontend Production Build | `cd frontend && npm run build` | Passed (`vite build` exit code 0) |
| Docker Compose Config & Stack | `docker compose config --quiet && docker compose down -v && docker compose up -d --build` | All 3 containers (`eticket-postgres`, `eticket-backend`, `eticket-frontend`) built cleanly, applied Prisma migration `20261121154357_upgrade_ticketing_lifecycle`, and started healthy |
| Live HTTP Endpoints | `http://localhost:4000/health`, `http://localhost:3001/health`, `http://localhost:3001/api/v1/events`, `http://localhost:3001/`, `http://localhost:4000/api/docs` | All returned HTTP `200` (`health` status `ok`, seeded event count `1`) |

---

## 5. Docker Deployment & Environment Variables

### Environment Variables (`.env.example` / `.env`)
- `FRONTEND_PORT` (default `3000`; currently `3001` in local `.env` to avoid host port conflict)
- `BACKEND_PORT` (default `4000`)
- `DB_PORT` (default `5432`; currently `5433` in local `.env` to avoid host port conflict)
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DATABASE_URL`
- `NODE_ENV`, `PORT`, `API_PREFIX`, `CORS_ORIGIN`
- `JWT_SECRET`, `JWT_EXPIRES_IN`, `QR_SIGNING_SECRET`, `COOKIE_SECURE`, `ORDER_RESERVATION_MINUTES`
- `VITE_API_BASE_URL`

### Running & Seeding
```powershell
docker compose up -d --build
docker compose ps
# Optional sample seed data (admin@eticket.com, organizer@eticket.com, customer@eticket.com, scanner@eticket.com / Password123!)
cd backend
npm run prisma:seed
```

---

## 6. Known Limitations & Recommended Future Improvements

1. **Bakong KHQR Live Integration:** `KHQRPaymentProvider` is stubbed intentionally (`501 Not Implemented`); implement Bakong KHQR payload generation, MD5 transaction polling, and merchant webhook signature validation once live credentials are provisioned.
2. **Background Reservation Sweeper:** Stale `PENDING` order expiration currently triggers opportunistically during order creation/reads and payment checks; adding a scheduled NestJS cron worker (`@nestjs/schedule`) would sweep expired orders automatically even during zero traffic.
3. **Browser E2E Automation:** Adding Playwright browser tests against the running Nginx + API stack would supplement the Vitest + Supertest suites with full real-browser verification.

---

## 7. Post-Report Additions (Current `main` Branch)

Following the Phase 2–8 baseline report above, the following capabilities were added and merged into `main`:

- **Google OAuth 2.0 Sign-In (`backend` + `frontend`):** Added `googleId`, `avatarUrl`, and nullable `password` in Prisma migration `20261121170000_add_google_oauth`, `GET /api/v1/auth/google/config`, `POST /api/v1/auth/google` (`google-auth-library`), and `useGoogleAuth` integration across standalone `/login`, `/register`, and `/register/organization` pages.
- **Guest Checkout (`backend` + `frontend`):** Added nullable `userId`, `guestName`, `guestEmail`, `guestPhone`, and `guestTokenHash` in Prisma migration `20261121180000_add_guest_checkout_orders`, enabling unauthenticated buyers to reserve, pay, view, and cancel orders via `x-guest-token` / `?token=` without creating an account.
- **SaaS Organizer Studio, Team Roles & Admin Console:** Added `GET/POST/DELETE /api/v1/organizer/team`, `POST /api/v1/admin/users`, `/organization` business landing page, `/organizer/team` & `/organizer/scanner` workspaces, `DashboardShellLayout` / `OrganizerWorkspaceLayout`, Donut & Sales Bar analytics cards, and the Ivory/Emerald/Forest UI redesign with GSAP/Motion animations.
- **Self-Contained Backend E2E Suite:** Updated `backend/test/app.e2e-spec.ts` to seed and clean up its own `ADMIN` user and test records so CI runs cleanly against an empty PostgreSQL database.
