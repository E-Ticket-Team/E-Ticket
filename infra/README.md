# Infrastructure, Containerization & CI/CD Documentation

This directory contains the deployment and infrastructure configuration for the **Universal E-Ticketing Platform**.

## 1. Overview & Architecture

The system is fully containerized using Docker and orchestrated using Docker Compose:

```
[ Client Browser ]
        │
        ▼ (Port 3000 -> Container Port 80)
┌────────────────────────────────────────────────────────┐
│               Frontend Container (Nginx)                │
│  - Static React SPA files                              │
│  - Reverse Proxy: /api/*  ───► Backend:4000            │
│  - Reverse Proxy: /health ───► Backend:4000/health     │
└───────────────────────┬────────────────────────────────┘
                        │ (Internal Docker Network: eticket-network)
                        ▼
┌────────────────────────────────────────────────────────┐
│            Backend Container (NestJS)                   │
│  - Port 4000 (Internal & Host accessible)              │
│  - Prisma ORM                                          │
│  - Health Check Endpoint (/health)                     │
│  - Swagger OpenAPI Documentation (/api/docs)           │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼ (Port 5432)
┌────────────────────────────────────────────────────────┐
│           Database Container (PostgreSQL 16)           │
│  - Persistent Volume: eticket_postgres_data           │
│  - Native health checks via pg_isready                 │
└────────────────────────────────────────────────────────┘
```

---

## 2. Docker Containers

### Backend (`backend/Dockerfile`)
- **Base image:** Node.js 20 Alpine (`node:20-alpine`) for minimal footprint and security.
- **Multi-stage build:**
  - `builder`: Installs all dependencies (`npm ci`), generates Prisma client (`npx prisma generate`), and compiles NestJS TypeScript code (`npm run build`).
  - `runner`: Production image containing only production dependencies (`npm ci --omit=dev`), the compiled `dist/` directory, and runtime Prisma engine.
- **Security:** Runs as unprivileged `node` user (`USER node`).
- **Healthcheck:** Evaluates API health via `wget -qO- http://localhost:4000/health`.
- **Database synchronization:** An entrypoint script (`docker-entrypoint.sh`) synchronizes database schema via `npx prisma db push --skip-generate` on startup before launching the application.

### Frontend (`frontend/Dockerfile`)
- **Multi-stage build:**
  - `builder`: Compiles Vite + React TypeScript bundle (`npm run build`).
  - `runner`: Uses `nginx:1.27-alpine` to serve static assets with gzip compression, asset caching headers, and SPA fallback routing.
- **Reverse Proxy:** Proxies requests directed to `/api/` and `/health` directly to `http://backend:4000`, eliminating CORS complexities in containerized deployments.

---

## 3. Running with Docker Compose

### Production Mode (All-in-One Stack)

To build and start the entire platform (PostgreSQL, NestJS API, and React Frontend):

```bash
# 1. Copy environment configuration
cp .env.example .env

# 2. Build and launch all containers in detached mode
docker compose up -d --build

# 3. View container logs
docker compose logs -f

# 4. Stop and remove containers
docker compose down
```

#### Accessing Services
- **Frontend Web UI:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:4000](http://localhost:4000)
- **API Health Check:** [http://localhost:4000/health](http://localhost:4000/health) or [http://localhost:3000/health](http://localhost:3000/health)
- **Swagger Documentation:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **PostgreSQL Database:** `localhost:5432` (credentials from `.env`)

---

### Development Mode (with Live Code Reload)

For active development inside containers without local Node.js or PostgreSQL installations:

```bash
docker compose -f docker-compose.dev.yml up --build
```

---

## 4. CI/CD Pipeline (GitHub Actions)

The continuous integration pipeline is defined at [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). It automatically triggers on every `push` and `pull_request` to `main`, `master`, `feat/**`, and `dev-*`.

### Pipeline Stages

1. **`backend-ci` (NestJS + Prisma):**
   - Provisions an ephemeral PostgreSQL 16 service container with health checks.
   - Sets up Node.js 20 with npm caching.
   - Installs clean dependencies (`npm ci`).
   - Generates Prisma client bindings (`npx prisma generate`).
   - Compiles TypeScript code (`npm run build`).
   - Executes unit tests (`npm test`).
   - Applies database migrations (`npx prisma db push`).
   - Runs integration/E2E tests (`npm run test:e2e`).

2. **`frontend-ci` (React + Vite):**
   - Sets up Node.js 20 with npm caching.
   - Installs dependencies (`npm ci`).
   - Runs TypeScript strict type validation (`npm run typecheck`).
   - Compiles production bundle (`npm run build`).

3. **`docker-ci` (Container Integration):**
   - Validates `docker-compose.yml` syntax using `docker compose config`.
   - Builds Backend and Frontend Docker images via Docker Buildx.
   - Starts the full multi-container stack (`docker compose up -d --build`).
   - Verifies health check endpoints:
     - Backend API: `GET /health`
     - Frontend UI: `GET /`
     - Nginx reverse proxy: `GET :3000/health`
   - Tears down containers and volumes safely.

---

## 5. Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `FRONTEND_PORT` | Host port for Frontend Web UI | `3000` |
| `BACKEND_PORT` | Host port for Backend NestJS API | `4000` |
| `DB_PORT` | Host port for PostgreSQL database | `5432` |
| `DB_USER` | PostgreSQL superuser username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `postgres` |
| `DB_NAME` | PostgreSQL database name | `eticket` |
| `DATABASE_URL` | Prisma PostgreSQL connection string | `postgresql://...` |
| `NODE_ENV` | Application environment (`development` / `production`) | `production` |
| `API_PREFIX` | Base route prefix for API endpoints | `api/v1` |
| `CORS_ORIGIN` | Allowed CORS origins (`*` or comma-separated URLs) | `*` |
| `VITE_API_BASE_URL`| API origin override for Vite build | `""` (proxied by Nginx) |
