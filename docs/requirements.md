# Requirements Specification — Universal E-Ticketing Platform

This document defines the functional and non-functional requirements implemented in the **Universal E-Ticketing Platform**.

---

## 1. User Roles & Permissions

| Role | Description & Capabilities |
|---|---|
| `CUSTOMER` | Discover published events, reserve and purchase tickets, cancel/refund unused orders, view digital QR passes (`/my-tickets`), inspect own tickets |
| `GUEST` *(unauthenticated buyer)* | Browse published events, reserve and pay for tickets via guest checkout (`guestName`, `guestEmail`, optional `guestPhone`) using a cryptographic `guestToken`, cancel/refund unused guest orders |
| `ORGANIZER` | Create and manage own events and ticket tiers, view revenue analytics & buyers list, view attendees/check-ins, provision/assign `SCANNER` gate staff, and scan own events |
| `SCANNER` | View authorized events (`EventScanner`) and perform gate QR/code ticket check-in (`POST /api/v1/tickets/validate`); prohibited from purchasing tickets |
| `ADMIN` | Full platform visibility: overview KPIs, user/role creation & suspension, all events moderation, global order/ticket monitoring, and gate scanning |

---

## 2. Functional Requirements

### FR-1: Authentication & Account Lifecycle
- **FR-1.1:** Users can register publicly as `CUSTOMER` or `ORGANIZER` via email/password (`POST /api/v1/auth/register/customer`, `/register/organization`, `/register`). Public self-registration of `ADMIN` or `SCANNER` roles must be rejected.
- **FR-1.2:** Users can authenticate via email/password (`POST /api/v1/auth/login`) or **Google OAuth 2.0 Sign-In** (`POST /api/v1/auth/google`), receiving both an `HttpOnly` session cookie (`eticket_access_token`) and a JWT Bearer token.
- **FR-1.3:** Suspended accounts (`isActive = false`) must be denied login, Google Sign-In, and API access.
- **FR-1.4:** Users can sign out (`POST /api/v1/auth/logout`), clearing the session cookie.

### FR-2: Event Discovery & Organizer Event Management
- **FR-2.1:** Unauthenticated callers and non-owners can browse only `PUBLISHED` (and explicitly filtered `COMPLETED`) events with pagination, search (title, venue, location, category, description), category filter, date bounds, and sorting.
- **FR-2.2:** Organizers can create events (`DRAFT` or `PUBLISHED`), update event details/status, and delete events that have no orders or issued tickets.
- **FR-2.3:** Event organizers can create, update, and delete ticket tiers (`TicketType`). Reducing `totalQuantity` below already reserved or sold inventory must be rejected.

### FR-3: Order Reservation & Guest Checkout
- **FR-3.1:** Buyers (authenticated or guest) can reserve 1–20 tickets per tier in a single order (`POST /api/v1/orders`).
- **FR-3.2:** Ticket prices and subtotals must be computed server-side from database `TicketType.price` values in integer minor units (cents) — client-supplied totals are never trusted.
- **FR-3.3:** Inventory must be decremented atomically inside a `Serializable` transaction; insufficient stock returns `409 Conflict` without overselling under concurrent requests.
- **FR-3.4:** Pending orders expire after `ORDER_RESERVATION_MINUTES` (default 15 minutes). Expired or cancelled `PENDING` orders and refunded unused `PAID` orders must release `remainingQuantity` back to the tier **exactly once** (`inventoryReleased` guard).

### FR-4: Payment Processing & QR Ticket Issuance
- **FR-4.1:** Payments are processed through a pluggable `PaymentProviderStrategy` supporting `MOCK` (development/QA simulation) and `KHQR` (documented Bakong integration stub).
- **FR-4.2:** Repeated payment requests with the same `idempotencyKey` for the same order must replay the recorded result without double-charging or issuing duplicate tickets.
- **FR-4.3:** Payment webhook callbacks (`POST /api/v1/payments/webhook`) must verify HMAC-SHA256 `x-webhook-signature` and settle orders idempotently.
- **FR-4.4:** Upon order settlement (`PAID`), the system generates one `Ticket` per reserved seat with a unique non-sequential `ticketCode` (`TKT-XXXXXX-XXXXXX`) and stores the SHA-256 hash (`qrTokenHash`) of an HMAC-SHA256 signed `ETK1.<ticketCode>.<sig>` credential.

### FR-5: Gate Validation & Team Staff Management
- **FR-5.1:** Only `ADMIN`, the event's `ORGANIZER`, or a `SCANNER` explicitly assigned via `EventScanner` may validate tickets for an event.
- **FR-5.2:** Gate check-in supports both camera QR scanning (`BarcodeDetector` + `jsqr`) and manual ticket code entry.
- **FR-5.3:** Validating a `VALID` ticket atomically transitions it to `USED`, recording `usedAt` and `checkedInById`. Repeat or concurrent scans of an already-used ticket must return `409 Conflict`.
- **FR-5.4:** Organizers can manage gate staff (`GET/POST/DELETE /api/v1/organizer/team` and `/events/:eventId/scanners`), including creating new `SCANNER` accounts scoped to selected or all created events.

### FR-6: Dashboards & Monitoring
- **FR-6.1:** Organizers have a studio workspace (`/organizer/*`) displaying gross, refunded, and net revenue, sales-over-time charts, buyers list, attendees, check-in logs, and team roles.
- **FR-6.2:** Admins have a console (`/admin`) displaying platform KPIs, 14-day sales analytics, event status controls, user/role management (preventing self-demotion or self-suspension), and global order/ticket monitors.

---

## 3. Non-Functional Requirements

- **NFR-1 Security:** Passwords hashed with `bcryptjs` (10 salt rounds); Helmet headers enabled; strict DTO whitelisting (`forbidNonWhitelisted: true`); global and endpoint-specific rate limiting (`@nestjs/throttler`); timing-safe comparison for QR credentials, guest tokens, and webhook signatures.
- **NFR-2 Concurrency & Reliability:** `Serializable` transactions with `P2034` retry logic for order reservations; atomic `updateMany` guards for inventory claiming, order expiration, and ticket check-in.
- **NFR-3 Monetary Accuracy:** PostgreSQL `DECIMAL(10, 2)` columns paired with integer cent math (`money.util.ts`) to prevent IEEE-754 floating-point drift.
- **NFR-4 Observability & Health:** Structured request logging (`LoggingInterceptor`), unified error envelopes, Swagger OpenAPI (`/api/docs`), and `GET /health` with PostgreSQL latency reporting.
- **NFR-5 Portability & CI/CD:** Multi-stage Docker builds (`backend/Dockerfile`, `frontend/Dockerfile`), Nginx reverse proxy (`infra/nginx/nginx.conf`), and automated GitHub Actions CI (`backend-ci`, `frontend-ci`, `docker-ci`).
