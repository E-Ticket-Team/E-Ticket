# API Contracts — Universal E-Ticketing Platform

Base API prefix: `/api/v1` (except `/` and `/health`). Interactive Swagger documentation is available at `GET /api/docs`.

## Response Envelopes

### Success Envelope
Wrapped automatically by `TransformInterceptor` for all routes except `GET /health`:
```json
{
  "success": true,
  "data": { "...": "..." },
  "timestamp": "2026-11-22T02:00:00.000Z"
}
```

### Error Envelope
Formatted by `AllExceptionsFilter` and `HttpExceptionFilter`:
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Detailed error message or validation array",
  "timestamp": "2026-11-22T02:00:00.000Z",
  "path": "/api/v1/auth/login",
  "method": "POST"
}
```

## Authentication Transport
Protected endpoints accept **either**:
- `HttpOnly` session cookie `eticket_access_token` (automatically set on login/register/Google auth and cleared on logout), **or**
- `Authorization: Bearer <accessToken>` header.

Guest order & payment endpoints accept a guest token via `x-guest-token: <guestToken>` header or `?token=<guestToken>` query parameter.

---

## 1. Root & Health

### `GET /`
Returns API metadata (`name`, `version`, `status`, `documentation`, `health`, `endpoints`).

### `GET /health`
Performs a PostgreSQL readiness probe (`SELECT 1`). Returns `200 OK` (unwrapped JSON) when healthy or `503 Service Unavailable` when PostgreSQL is unreachable:
```json
{
  "status": "ok",
  "timestamp": "2026-11-22T02:00:00.000Z",
  "uptime": 124,
  "environment": "development",
  "version": "1.0.0",
  "database": {
    "status": "up",
    "latencyMs": 3
  }
}
```

---

## 2. Authentication (`/api/v1/auth`)

| Method | Endpoint | Auth | Throttle | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/register/customer` | Public | 10 / 60s | Register `CUSTOMER` (`email`, `password` min 6, `firstName`, `lastName`, optional `phoneNumber`) |
| `POST` | `/api/v1/auth/register/organization` | Public | 10 / 60s | Register `ORGANIZER` (`email`, `password` min 6, `organizationName`, optional `firstName`, `lastName`, `phoneNumber`) |
| `POST` | `/api/v1/auth/register` | Public | 10 / 60s | Unified registration restricted strictly to `role`: `CUSTOMER` \| `ORGANIZER` |
| `POST` | `/api/v1/auth/login` | Public | 15 / 60s | Email/password sign-in (`email`, `password`); returns `AuthResponseDto` & sets cookie |
| `GET` | `/api/v1/auth/google/config` | Public | Default | Returns `{ enabled: boolean, clientId: string \| null }` |
| `POST` | `/api/v1/auth/google` | Public | 15 / 60s | Sign in or register (`CUSTOMER` \| `ORGANIZER`) via Google `credential` (ID token) or `accessToken`, optional `accountType`, `organizationName` |
| `POST` | `/api/v1/auth/logout` | Public | Default | Clears `eticket_access_token` cookie; returns `{ loggedOut: true }` |
| `GET` | `/api/v1/auth/me` | JWT | Default | Returns `UserProfileDto` (no `password`) |
| `GET` | `/api/v1/auth/profile` | JWT | Default | Alias for `/api/v1/auth/me` |

**Auth Response (`data`):**
```json
{
  "user": {
    "id": "a0000000-0000-0000-0000-000000000002",
    "email": "customer@eticket.com",
    "firstName": "Sophea",
    "lastName": "Sreng",
    "organizationName": null,
    "phoneNumber": "+85512345678",
    "avatarUrl": null,
    "role": "CUSTOMER",
    "isActive": true,
    "createdAt": "2026-11-15T08:00:00.000Z",
    "updatedAt": "2026-11-15T08:00:00.000Z"
  },
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresIn": "7d"
}
```

---

## 3. Events (`/api/v1/events`)

| Method | Endpoint | Auth / Roles | Description |
|---|---|---|---|
| `GET` | `/api/v1/events/categories` | Public | Distinct categories of `PUBLISHED` events |
| `GET` | `/api/v1/events` | Optional JWT | Paginated event listing (`page`, `limit`, `search`, `category`, `status`, `startAfter`, `endBefore`, `sortBy` [`startDate`\|`createdAt`\|`title`], `sortOrder` [`asc`\|`desc`], `mine` boolean) |
| `GET` | `/api/v1/events/:id` | Optional JWT | Event details + organizer summary + ticket tiers (non-owners/guests only see `PUBLISHED` or `COMPLETED`) |
| `POST` | `/api/v1/events` | `ORGANIZER`, `ADMIN` | Create event (`title`, `venue`, `startDate`, `endDate`, optional `description`, `category`, `location`, `bannerUrl`, `status`) |
| `PATCH` | `/api/v1/events/:id` | Owner `ORGANIZER`, `ADMIN` | Update event fields or status |
| `DELETE` | `/api/v1/events/:id` | Owner `ORGANIZER`, `ADMIN` | Delete event (`204 No Content`; blocked with `409 Conflict` if orders or tickets exist) |

---

## 4. Tickets (`/api/v1/tickets`)

| Method | Endpoint | Auth / Roles | Description |
|---|---|---|---|
| `POST` | `/api/v1/tickets/types` | Owner `ORGANIZER`, `ADMIN` | Create ticket tier (`eventId`, `name`, `price`, `totalQuantity`, optional `description`) |
| `PATCH` | `/api/v1/tickets/types/:id` | Owner `ORGANIZER`, `ADMIN` | Update tier (`name`, `description`, `price`, `totalQuantity` — cannot drop below reserved/sold count) |
| `DELETE` | `/api/v1/tickets/types/:id` | Owner `ORGANIZER`, `ADMIN` | Delete unused tier (`204 No Content`; blocked if orders/tickets exist) |
| `GET` | `/api/v1/tickets/types/event/:eventId` | Optional JWT | List ticket tiers for an event |
| `GET` | `/api/v1/tickets/my` | JWT | List all issued digital tickets for the authenticated user (with derived `qrPayload`) |
| `GET` | `/api/v1/tickets/scanner/events` | `ADMIN`, `ORGANIZER`, `SCANNER` | List events the caller is authorized to scan |
| `GET` | `/api/v1/tickets/validate` | Public | Endpoint usage metadata |
| `GET` | `/api/v1/tickets/:code` | JWT (Owner / Event Organizer / Assigned Scanner / Admin) | Retrieve ticket pass details and `qrPayload` |
| `POST` | `/api/v1/tickets/validate` | `ADMIN`, `ORGANIZER`, `SCANNER` | Throttle 60 / 60s. Validates `ticketCode` (raw code or `ETK1.` payload) and optional `eventId` atomically (`409` if already `USED`) |

**Validate Ticket Request & Success (`200 OK`):**
```json
// Request
{
  "ticketCode": "ETK1.TKT-2026-VIP-001.<sig>",
  "eventId": "b0000000-0000-0000-0000-000000000001"
}
```
Returns `{ valid: true, message: "...", ticket: { ... } }` on success, `409 Conflict` on duplicate check-in, `400 Bad Request` on cancelled/tampered/event-mismatch, and `403 Forbidden` if unauthorized for the event.

---

## 5. Orders (`/api/v1/orders`)

| Method | Endpoint | Auth / Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/orders` | Optional JWT (User or Guest) | Atomically reserves inventory (`items: [{ ticketTypeId, quantity }]`). Guests must supply `guestName`, `guestEmail` (optional `guestPhone`), receiving a one-time `guestToken` in response |
| `GET` | `/api/v1/orders` | JWT | List authenticated user's orders (auto-expires stale `PENDING` orders) |
| `GET` | `/api/v1/orders/:id` | Owner JWT, Admin, or `x-guest-token` / `?token=` | Retrieve order details, `items`, `payments`, and `tickets` |
| `POST` | `/api/v1/orders/:id/cancel` | Owner JWT, Admin, or `x-guest-token` / `?token=` | Cancel a `PENDING` order or refund an unused `PAID` order (`reason` optional) and atomically release inventory |

---

## 6. Payments (`/api/v1`)

| Method | Endpoint | Auth / Access | Throttle | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/orders/:id/payment` | Owner JWT, Admin, or `x-guest-token` / `?token=` | 20 / 60s | Process payment (`provider`: `MOCK` \| `KHQR`, optional `idempotencyKey`, `simulateOutcome`: `SUCCEEDED` \| `FAILED`). Issues tickets on success |
| `GET` | `/api/v1/orders/:id/payment` | Owner JWT, Admin, or `x-guest-token` / `?token=` | Default | Retrieve order payment status and attempt history |
| `POST` | `/api/v1/payments/webhook` | Public + `x-webhook-signature` HMAC-SHA256 | Default | Idempotent provider callback verifying HMAC-SHA256(`${orderId}:${providerReference}:${status}`) with `QR_SIGNING_SECRET` |

---

## 7. Organizer Studio & Team (`/api/v1/organizer`)

All routes require `JWT` and role `ORGANIZER` or `ADMIN` (scoped to organizer's own events unless `ADMIN`).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/organizer/dashboard` | Summary metrics (`grossRevenue`, `refundedAmount`, `netRevenue`, `ticketsSold`, `totalCheckIns`, `checkInRate`), `salesOverTime`, and `eventBreakdown` |
| `GET` | `/api/v1/organizer/orders` | Orders referencing the organizer's events (includes buyer/guest info and ticket items) |
| `GET` | `/api/v1/organizer/events/:eventId/analytics` | Per-event sales, tier breakdown, and check-in rate |
| `GET` | `/api/v1/organizer/events/:eventId/attendees` | Filterable attendee/ticket list (`?search=`, `?ticketTypeId=`, `?status=`) |
| `GET` | `/api/v1/organizer/events/:eventId/check-ins` | Gate check-in audit log for an event |
| `GET` | `/api/v1/organizer/events/:eventId/scanners` | List `SCANNER` accounts assigned to an event |
| `POST` | `/api/v1/organizer/events/:eventId/scanners` | Assign existing `SCANNER` account by `email` |
| `DELETE` | `/api/v1/organizer/events/:eventId/scanners/:userId` | Revoke scanner assignment (`204 No Content`) |
| `GET` | `/api/v1/organizer/team` | List all gate staff and their assigned events across the organizer's events |
| `POST` | `/api/v1/organizer/team` | Assign an existing `SCANNER` or create a new `SCANNER` user (`email`, optional `firstName`, `lastName`, `password` min 8, `eventIds[]`) |
| `DELETE` | `/api/v1/organizer/team/:userId` | Revoke gate access across all organizer events (or single `?eventId=`) (`204 No Content`) |

---

## 8. System Admin (`/api/v1/admin`)

All routes require `JWT` and role `ADMIN`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/admin/overview` | Platform-wide counts (`users.byRole`, `events`, `orders`, `tickets`) and 14-day `salesOverTime` |
| `GET` | `/api/v1/admin/users` | Paginated user directory (`page`, `limit`, `role`, `search`) |
| `POST` | `/api/v1/admin/users` | Create a user with any `Role` (`ADMIN`, `ORGANIZER`, `CUSTOMER`, `SCANNER`) |
| `PATCH` | `/api/v1/admin/users/:id` | Update `role` or `isActive` (blocks self-suspension and self-demotion) |
| `GET` | `/api/v1/admin/orders` | Paginated platform orders (`page`, `limit`, `status`, `search`) |
| `GET` | `/api/v1/admin/tickets` | Paginated platform tickets (`page`, `limit`, `status`, `search`) |
