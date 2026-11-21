# Infrastructure, Containerization & CI/CD Documentation

This directory contains the deployment and infrastructure configuration for the **Universal E-Ticketing Platform**.

## 1. Overview & Architecture

The system is fully containerized using Docker and orchestrated using Docker Compose:

```text
[ Client Browser ]
        │
        ▼ (Host Port 3000 -> Container Port 80)
┌────────────────────────────────────────────────────────┐
│               Frontend Container (Nginx)               │
│  - Static React SPA files (SPA fallback to index.html) │
│  - Reverse Proxy: /api/*  ───► backend:4000            │
│  - Reverse Proxy: /health ───► backend:4000/health     │
└───────────────────────┬────────────────────────────────┘
                        │ (Docker Bridge Network: eticket-network)
                        ▼
┌────────────────────────────────────────────────────────┐
│            Backend Container (NestJS 10)               │
│  - Port 4000 (Internal & Host accessible)              │
│  - Prisma ORM 5 (migrate deploy on startup)            │
│  - Health Check (/health) & Swagger Docs (/api/docs)   │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼ (Port 5432)
┌────────────────────────────────────────────────────────┐
│           Database Container (PostgreSQL 16)           │
│  - Persistent Volume: eticket_postgres_data            │
│  - Health checks via pg_isready                        │
└────────────────────────────────────────────────────────┘
```

---

## 2. Docker Containers

### Backend (`backend/Dockerfile`)
- **Base image:** `node:20-alpine` (with `openssl` installed for Prisma CLI and query engine).
- **Multi-stage build:**
  - `builder`: Installs dependencies (`npm ci`), generates Prisma client (`npx prisma generate`), and compiles NestJS (`npm run build`).
  - `runner`: Installs production dependencies (`npm ci --omit=dev`) plus global `prisma@5.22.0`, copies compiled `dist/`, `prisma/`, and generated `.prisma` client.
- **Security:** Runs as unprivileged `node` user (`USER node`).
- **Healthcheck:** `wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1`.
- **Database synchronization (`backend/docker-entrypoint.sh`):**
  - If `prisma/migrations` is non-empty, executes `npx prisma migrate deploy`; otherwise falls back to `npx prisma db push --skip-generate`.
  - If `SEED_DATABASE=true`, optionally executes the database seed script on startup.

### Frontend (`frontend/Dockerfile`)
- **Multi-stage build:**
  - `builder`: Accepts `VITE_API_BASE_URL` and `VITE_GOOGLE_CLIENT_ID` build args and builds the Vite + React TypeScript bundle (`npm run build`).
  - `runner`: Uses `nginx:1.27-alpine` with `infra/nginx/nginx.conf` (and `frontend/nginx.conf`) to serve static assets with gzip compression, 1-year static asset caching, and SPA fallback routing.
- **Reverse Proxy:** Proxies `/api/` and `/health` to `http://backend:4000`, keeping frontend and API same-origin for `HttpOnly` auth cookies.

---

## 3. Running with Docker Compose

### Production Stack (`docker-compose.yml`)

```bash
# 1. Copy environment configuration
cp .env.example .env

# 2. Build and launch all containers in detached mode
docker compose up -d --build

# 3. View status and logs
docker compose ps
docker compose logs -f

# 4. Stop stack (add -v to remove database volume)
docker compose down
```

#### Accessing Services
- **Frontend Web UI:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:4000](http://localhost:4000)
- **API Health Check:** [http://localhost:4000/health](http://localhost:4000/health) or [http://localhost:3000/health](http://localhost:3000/health)
- **Swagger Documentation:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **PostgreSQL Database:** `localhost:5432`

### Development Mode (`docker-compose.dev.yml`)

For containerized development with mounted source volumes and hot reload (Frontend on `:5173`, Backend on `:4000`, Postgres on `:5432`):

```bash
docker compose -f docker-compose.dev.yml up --build
```

---

## 4. CI/CD Pipeline (GitHub Actions)

Defined at [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), triggered on `push` to `main`, `master`, `feat/**`, `dev-*`, and `pull_request` to `main`/`master`:

1. **`backend-ci` (NestJS + Prisma):**
   - Spins up a `postgres:16-alpine` service container with `pg_isready` health check.
   - Runs `npm ci`, `npx prisma generate`, `npm run build`, `npm test`, `npx prisma db push`, and `npm run test:e2e`.
2. **`frontend-ci` (React + Vite):**
   - Runs `npm ci`, `npm run typecheck`, and `npm run build`.
3. **`docker-ci` (Container Integration):**
   - Validates `docker compose config`.
   - Builds Backend and Frontend Docker images with Buildx.
   - Boots the full stack (`docker compose up -d --build`) and verifies `http://localhost:4000/health`, `http://localhost:3000/`, and `http://localhost:3000/health` before tearing down with `docker compose down -v`.

---

## 5. Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `FRONTEND_PORT` | Host port mapped to Frontend Nginx `:80` | `3000` |
| `BACKEND_PORT` | Host port mapped to Backend NestJS `:4000` | `4000` |
| `DB_PORT` | Host port mapped to PostgreSQL `:5432` | `5432` |
| `DB_USER` | PostgreSQL user | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `postgres` |
| `DB_NAME` | PostgreSQL database name | `eticket` |
| `DATABASE_URL` | Prisma PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/eticket?schema=public` |
| `NODE_ENV` | Application environment (`development`, `production`, `test`) | `development` (`.env.example`) / `production` (Compose) |
| `PORT` | Backend HTTP port | `4000` |
| `API_PREFIX` | Global API route prefix | `api/v1` |
| `CORS_ORIGIN` | Allowed CORS origins (`*` or comma-separated list) | `*` |
| `JWT_SECRET` | Secret key for signing JWTs | `eticket-jwt-secret-key-change-in-production-2026` |
| `JWT_EXPIRES_IN` | JWT & cookie lifetime | `7d` |
| `QR_SIGNING_SECRET` | HMAC secret for `ETK1.` QR tokens and payment webhooks | `eticket-qr-signing-secret-change-in-production-2026` |
| `COOKIE_SECURE` | Set `Secure` attribute on `HttpOnly` auth cookies | `false` |
| `ORDER_RESERVATION_MINUTES` | Pending order hold TTL in minutes | `15` |
| `GOOGLE_CLIENT_ID` | Optional Google OAuth 2.0 Web Client ID | `""` |
| `VITE_API_BASE_URL` | Optional API origin override for Vite build | `""` (proxied by Nginx/Vite) |
| `VITE_GOOGLE_CLIENT_ID` | Google Client ID passed to Vite build | `${GOOGLE_CLIENT_ID}` |
