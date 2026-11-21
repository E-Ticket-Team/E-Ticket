# Universal E-Ticketing Platform

![CI Pipeline](https://github.com/E-Ticket-Team/E-Ticket/actions/workflows/ci.yml/badge.svg)

A full-stack web platform for discovering events, reserving and purchasing digital tickets (with both authenticated accounts and guest checkout), issuing cryptographically signed QR-code passes, validating gate entry atomically, and managing events through dedicated Organizer, Gate Scanner, and Admin SaaS workspaces.

---

## Key Capabilities

- **Event Discovery & Publishing:** Public catalog with server-side pagination, search, category/status/date filtering, sorting, and event detail views (`DRAFT` events are hidden from public callers).
- **Authentication & Role-Based Access Control (RBAC):**
  - Dual **HttpOnly session cookie** (`eticket_access_token`) + **JWT Bearer** authentication (`ADMIN`, `ORGANIZER`, `CUSTOMER`, `SCANNER`).
  - Public email/password registration restricted to `CUSTOMER` and `ORGANIZER` accounts (`ADMIN` and `SCANNER` cannot be self-assigned).
  - **Google OAuth 2.0 Sign-In** via Google Identity Services (`POST /api/v1/auth/google`), verified server-side with `google-auth-library`.
- **Guest & Authenticated Checkout:**
  - Customers can reserve tickets while logged in or via **guest checkout** (`guestName`, `guestEmail`, optional `guestPhone`) using a high-entropy `guestToken` (stored as SHA-256 `guestTokenHash`).
  - **Atomic Inventory Reservation:** Uses PostgreSQL `Serializable` transactions with conditional `updateMany` checks, integer minor-unit calculations (`money.util.ts`), and configurable reservation TTL (`ORDER_RESERVATION_MINUTES`, default 15 minutes) with single-release expiration guards.
- **Payments & Signed QR Passes:**
  - Strategy-based `PaymentsModule` with `MockPaymentProvider` (development/QA) and a documented `KHQRPaymentProvider` contract (stubbed `501 Not Implemented` pending live Bakong merchant credentials), idempotency keys, and HMAC-verified payment webhooks.
  - Issues non-sequential `TKT-XXXXXX-XXXXXX` codes and HMAC-SHA256 signed `ETK1.<ticketCode>.<sig>` QR credentials (only SHA-256 `qrTokenHash` is persisted).
- **Atomic Gate Check-In:**
  - `POST /api/v1/tickets/validate` verifies event authorization (`EventScanner` assignment or event owner/admin), validates `ETK1.` credentials, and performs an atomic `updateMany({ where: { id, status: 'VALID' } })` transition to `USED` to block duplicate/concurrent scans (`409 Conflict`).
  - Camera QR scanning via native `BarcodeDetector` with `jsqr` fallback plus manual code entry.
- **Organizer Studio, Team Management & Admin Console:**
  - Organizer dashboard with gross/refunded/net revenue metrics, sales analytics, tier management, attendee & check-in logs, and gate staff (`SCANNER`) creation/assignment across events.
  - Admin console for platform-wide KPIs, user/role management, event status moderation, and order/ticket monitoring.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18.3, TypeScript 5.6, Vite 6, React Router 6, Tailwind CSS 3.4, GSAP & Motion, Lucide React, `qrcode.react`, `jsqr` |
| **Backend** | NestJS 10, TypeScript, Prisma ORM 5, `helmet`, `@nestjs/throttler`, `cookie-parser`, `bcryptjs`, `passport-jwt`, `google-auth-library`, Swagger / OpenAPI |
| **Database** | PostgreSQL 16 (`DECIMAL(10, 2)` money columns, UUID v4 keys, versioned Prisma migrations) |
| **Testing** | Jest + Supertest (backend unit & E2E), Vitest + React Testing Library (frontend) |
| **Infrastructure** | Docker, Docker Compose, Nginx 1.27 Alpine (reverse proxy & SPA fallback), GitHub Actions CI |

---

## Team

| Member | Role |
|---|---|
| SRENG Sophea | Project Manager |
| THA Channthy | Backend Engineer |
| LORN DaVid | Backend Engineer |
| NETHNIB Sovannarath | Frontend Developer |
| THAI Phanet | QA & DevOps Specialist |

---

## Project Structure

```text
E-Ticket/
├── .github/workflows/ci.yml   # GitHub Actions CI (backend-ci, frontend-ci, docker-ci)
├── .env.example               # Root environment template for Docker Compose & local dev
├── docker-compose.yml         # Production-style stack (PostgreSQL 16, NestJS API, Nginx SPA)
├── docker-compose.dev.yml     # Development Compose stack with hot-reload volumes
├── backend/                   # NestJS REST API
│   ├── prisma/
│   │   ├── schema.prisma      # User, Event, TicketType, Order, OrderItem, Payment, Ticket, EventScanner
│   │   ├── migrations/        # Versioned Prisma SQL migrations
│   │   └── seed.ts            # Deterministic sample users, 6 events, tiers, order, and ticket
│   ├── src/
│   │   ├── common/            # Filters, interceptors, money & QR credential utilities
│   │   ├── config/            # Typed config & class-validator env validation
│   │   └── modules/           # admin, auth, events, health, orders, organizer, payments, prisma, tickets
│   └── test/                  # End-to-end Supertest integration suite
├── frontend/                  # React + Vite SPA
│   ├── public/banners/        # Event banner assets
│   └── src/
│       ├── animations/        # GSAP & reduced-motion helpers
│       ├── components/        # UI, auth, common, dashboard, scanner, and ticket components
│       ├── contexts/          # AuthContext, ToastContext
│       ├── hooks/             # useAuth, useGoogleAuth
│       ├── pages/             # Public, auth, customer, organizer, scanner, and admin pages
│       ├── services/          # Typed API client & module services
│       └── test/              # Vitest + React Testing Library suite
├── docs/                      # Architecture, API contracts, requirements, audit & report
└── infra/                     # Nginx configuration & infrastructure documentation
```

---

## Quick Start (Docker — Recommended)

Launch PostgreSQL, the NestJS backend, and the Nginx-served React frontend in one command:

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Build and launch all containers
docker compose up -d --build

# 3. Check container health and logs
docker compose ps
docker compose logs -f
```

### Accessing Services
- **Frontend Web UI:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:4000](http://localhost:4000)
- **API Health Check:** [http://localhost:4000/health](http://localhost:4000/health) (or `http://localhost:3000/health` via Nginx)
- **Swagger OpenAPI Docs:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

### Optional: Seed Sample Data
When running with Docker Compose, you can populate the deterministic sample dataset (`admin@eticket.com`, `organizer@eticket.com`, `customer@eticket.com`, `scanner@eticket.com`, 6 events, ticket tiers, and sample ticket `TKT-2026-VIP-001`):

```bash
docker compose exec backend npx ts-node prisma/seed.ts
```

To stop the stack:

```bash
docker compose down
```

*(For live-reload container development, run `docker compose -f docker-compose.dev.yml up --build`.)*

---

## Quick Start (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) v20+ (v18+ supported; CI uses Node 20)
- [PostgreSQL](https://www.postgresql.org/) v14+ (or Docker)

### 1. Start PostgreSQL & Configure Environment
```bash
# Start only PostgreSQL via Docker (or use a local PostgreSQL instance)
docker compose up -d postgres

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
```

Ensure `backend/.env` (or root `.env`) contains at minimum:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eticket?schema=public"
PORT=4000
API_PREFIX=api/v1
CORS_ORIGIN=*
NODE_ENV=development
JWT_SECRET=eticket-jwt-secret-key-change-in-production-2026
JWT_EXPIRES_IN=7d
QR_SIGNING_SECRET=eticket-qr-signing-secret-change-in-production-2026
COOKIE_SECURE=false
ORDER_RESERVATION_MINUTES=15
GOOGLE_CLIENT_ID=
```

### 2. Backend Setup & Run
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy    # Or `npx prisma db push` for schema prototyping
npm run prisma:seed          # Optional: seeds demo accounts and 6 published events
npm run start:dev
```

### 3. Frontend Setup & Run
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```

- **Frontend Dev Server:** [http://localhost:5173](http://localhost:5173) (Vite proxies `/api` and `/health` to `http://localhost:4000`)
- **Backend Swagger Docs:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

---

## Seeded Demo Accounts

Running `npm run prisma:seed` creates four accounts (all using password `Password123!`, also available as 1-click quick-fill options on `/login`):

| Role | Email | Default Workspace |
|---|---|---|
| `ADMIN` | `admin@eticket.com` | `/admin` |
| `ORGANIZER` | `organizer@eticket.com` | `/organizer` |
| `SCANNER` | `scanner@eticket.com` | `/scanner` |
| `CUSTOMER` | `customer@eticket.com` | `/events` |

Sample issued ticket created by the seed script: **`TKT-2026-VIP-001`** (`VALID`, VIP All-Access Pass for *Cambodia Tech Expo & Music Festival 2026*).

---

## Frontend Routes

| Access | Routes | Purpose |
|---|---|---|
| **Public & Guest** | `/`, `/events`, `/events/:id`, `/organization`, `/checkout/:orderId` | Event discovery, business landing, guest-capable ticket reservation & checkout |
| **Auth** | `/login`, `/register`, `/register/organization` | Email/password & Google Sign-In flows |
| **Authenticated** | `/my-account`, `/my-tickets`, `/tickets`, `/tickets/:code` | Profile, digital QR ticket wallet, authorized ticket inspection |
| **Gate Staff** | `/scanner` | Camera (`BarcodeDetector` + `jsqr`) & manual ticket check-in workspace |
| **Organizer** | `/organizer`, `/organizer/events`, `/organizer/events/new`, `/organizer/events/:id/edit`, `/organizer/orders`, `/organizer/attendees`, `/organizer/check-ins`, `/organizer/team`, `/organizer/scanner` | Organizer studio: KPIs, sales analytics, event/tier CRUD, buyers list, team & scanner management |
| **Admin** | `/admin` | System-wide KPIs, event moderation, user & role creation/updates, order & ticket monitoring |

---

## REST API Overview

All `/api/v1/*` responses use `{ success: true, data, timestamp }` on success and `{ success: false, statusCode, error, message, timestamp, path, method }` on error. See [`docs/api-contracts.md`](docs/api-contracts.md) or `/api/docs` for full schemas.

| Module | Key Endpoints |
|---|---|
| **Root & Health** | `GET /`, `GET /health` |
| **Auth** | `POST /api/v1/auth/register/customer`, `POST /api/v1/auth/register/organization`, `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/google/config`, `POST /api/v1/auth/google`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`, `GET /api/v1/auth/profile` |
| **Events** | `GET /api/v1/events`, `GET /api/v1/events/categories`, `GET /api/v1/events/:id`, `POST /api/v1/events`, `PATCH /api/v1/events/:id`, `DELETE /api/v1/events/:id` |
| **Tickets** | `POST /api/v1/tickets/types`, `PATCH /api/v1/tickets/types/:id`, `DELETE /api/v1/tickets/types/:id`, `GET /api/v1/tickets/types/event/:eventId`, `GET /api/v1/tickets/my`, `GET /api/v1/tickets/scanner/events`, `GET /api/v1/tickets/:code`, `POST /api/v1/tickets/validate` |
| **Orders** | `POST /api/v1/orders`, `GET /api/v1/orders`, `GET /api/v1/orders/:id`, `POST /api/v1/orders/:id/cancel` |
| **Payments** | `POST /api/v1/orders/:id/payment`, `GET /api/v1/orders/:id/payment`, `POST /api/v1/payments/webhook` |
| **Organizer** | `GET /api/v1/organizer/dashboard`, `GET /api/v1/organizer/orders`, `GET /api/v1/organizer/events/:eventId/analytics`, `GET /api/v1/organizer/events/:eventId/attendees`, `GET /api/v1/organizer/events/:eventId/check-ins`, `GET/POST/DELETE /api/v1/organizer/events/:eventId/scanners`, `GET/POST/DELETE /api/v1/organizer/team` |
| **Admin** | `GET /api/v1/admin/overview`, `GET/POST /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id`, `GET /api/v1/admin/orders`, `GET /api/v1/admin/tickets` |

---

## Testing & Verification

```bash
# Backend unit & E2E tests (requires PostgreSQL for E2E)
cd backend
npm test
npm run test:e2e
npm run build

# Frontend typecheck, unit/component tests, and production build
cd frontend
npm run typecheck
npm test
npm run build
```

---

## Documentation Index

- [`docs/architecture.md`](docs/architecture.md) — System architecture, PostgreSQL ERD, module design, and sequence flows
- [`docs/api-contracts.md`](docs/api-contracts.md) — Complete REST API request/response contracts
- [`docs/requirements.md`](docs/requirements.md) — Functional and non-functional requirements specification
- [`docs/IMPLEMENTATION_AUDIT.md`](docs/IMPLEMENTATION_AUDIT.md) — Baseline pre-upgrade audit
- [`docs/IMPLEMENTATION_REPORT.md`](docs/IMPLEMENTATION_REPORT.md) — Implementation summary and verification report
- [`backend/README.md`](backend/README.md) — Backend API setup and module reference
- [`frontend/README.md`](frontend/README.md) — Frontend SPA routes, UI architecture, and testing
- [`infra/README.md`](infra/README.md) — Docker, Nginx, environment variables, and GitHub Actions CI/CD

---

## Security

Never commit real passwords, JWT/QR secrets, OAuth secrets, database credentials, or `.env` files to Git. Set strong `JWT_SECRET` and `QR_SIGNING_SECRET` values in production, enable `COOKIE_SECURE=true` behind HTTPS, and configure `CORS_ORIGIN` to your production domain(s).
