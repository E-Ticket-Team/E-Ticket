# Security Policy — Universal E-Ticketing Platform

## 1. Supported Versions

Security fixes are actively maintained on the default `main` branch of `E-Ticket-Team/E-Ticket`.

| Branch / Version | Supported | Notes |
|---|---|---|
| `main` (`1.x`) | Yes | Active development and security fixes |
| Older feature branches (`feat/**`, `dev-*`) | No | Merge into or rebase onto `main` |

---

## 2. Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub Issues, Pull Requests, or Discussions.**

If you discover a security issue (such as authentication/RBAC bypass, QR credential forgery, payment/order race condition, SQL injection, or exposed secrets):

1. **GitHub Private Vulnerability Reporting (Preferred):** Open a private security advisory at [`https://github.com/E-Ticket-Team/E-Ticket/security/advisories/new`](https://github.com/E-Ticket-Team/E-Ticket/security/advisories/new).
2. **Direct Contact:** Reach out privately to the project maintainers at `support@eticket.com.kh` with `[SECURITY]` in the subject line.

### What to Include
- Clear description of the vulnerability and affected endpoint, page, or file path.
- Step-by-step reproduction instructions or minimal proof-of-concept (without targeting production data or real user accounts).
- Potential impact (e.g., privilege escalation, double-spend, duplicate ticket redemption, data exposure).

We aim to acknowledge reports promptly, investigate and patch confirmed issues on a private fix branch, rotate any impacted credentials, and publish an advisory after remediation.

---

## 3. Implemented Security Architecture

The platform enforces security controls server-side in NestJS (`backend/`) and PostgreSQL (`backend/prisma/`):

- **Authentication & Sessions (`AuthModule`):**
  - Passwords hashed with `bcryptjs` (`10` salt rounds) and excluded from all API profile projections.
  - Dual JWT extraction supporting `HttpOnly` session cookies (`eticket_access_token`, `sameSite: 'lax'`) and `Authorization: Bearer <token>`.
  - Public registration (`POST /api/v1/auth/register*`) restricted strictly to `CUSTOMER` and `ORGANIZER` (`PublicRegistrationRole`), blocking self-assignment of `ADMIN` or `SCANNER`.
  - Google OAuth 2.0 tokens verified server-side (`google-auth-library`) against `GOOGLE_CLIENT_ID`.
  - Soft-suspended accounts (`isActive === false`) are blocked on login, Google auth, and every JWT-protected request.
- **Authorization & Input Validation:**
  - `JwtAuthGuard`, `RolesGuard`, and service-level resource ownership checks enforce permissions across `ADMIN`, `ORGANIZER`, `SCANNER`, and `CUSTOMER` roles.
  - Global `ValidationPipe` enforces `whitelist: true` and `forbidNonWhitelisted: true`.
  - HTTP hardening via `helmet`, `cookie-parser`, credentialed CORS, and `@nestjs/throttler` rate limiting (200 req/min global default; stricter limits on auth, payment, and validation endpoints).
- **Orders, Payments & QR Credentials:**
  - Order reservations run inside `Serializable` PostgreSQL transactions with conditional `remainingQuantity` decrements and server-side integer minor-unit pricing (`money.util.ts`).
  - Pending order expiration and cancellation/refunds use an atomic `inventoryReleased` guard to prevent double inventory restoration.
  - Payment processing enforces unique `idempotencyKey` values; webhooks (`POST /api/v1/payments/webhook`) verify HMAC-SHA256 `x-webhook-signature` headers using `crypto.timingSafeEqual`.
  - Guest order access uses random 32-byte `guestToken` credentials stored only as SHA-256 `guestTokenHash` digests and verified in constant time.
  - Issued tickets use non-sequential `TKT-XXXXXX-XXXXXX` codes and HMAC-SHA256 signed `ETK1.<ticketCode>.<sig>` QR credentials, storing only SHA-256 `qrTokenHash` in PostgreSQL.
  - Gate check-in (`POST /api/v1/tickets/validate`) enforces event-scoped authorization (`EventScanner` / owner / admin) and performs an atomic conditional update (`WHERE status = 'VALID'`) to reject concurrent or duplicate scans with `409 Conflict`.
- **Container & Repository Hygiene:**
  - Backend Docker container runs as the unprivileged `node` user (`backend/Dockerfile`).
  - Secret `.env` files are excluded via `.gitignore`; only placeholder `.env.example` templates are committed.

---

## 4. Production Deployment Checklist

Before deploying outside local development:

1. **Replace Default Secrets:** Set strong, randomly generated values for `JWT_SECRET` and `QR_SIGNING_SECRET` (do not use the `.env.example` defaults).
2. **Enable HTTPS & Secure Cookies:** Serve behind TLS/HTTPS and set `COOKIE_SECURE=true`.
3. **Restrict CORS:** Set `CORS_ORIGIN` to your exact frontend origin(s) instead of `*`.
4. **Do Not Seed Demo Accounts in Production:** `backend/prisma/seed.ts` creates demo accounts with a known development password (`Password123!`) and must only be used in local/QA environments.
5. **Payment Providers:** `MockPaymentProvider` (`MOCK`) is strictly for development and automated testing. Configure live payment provider credentials (`KHQR` or equivalent) before accepting real transactions.
