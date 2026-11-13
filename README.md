# Universal E-Ticketing Platform

A web-based platform for creating, selling, purchasing, and validating digital tickets for events, concerts, cinemas, workshops, sports, and entertainment venues.

## Project Goals

- Enable organizers to create and manage events.
- Allow customers to discover and purchase tickets online.
- Issue unique QR-code tickets after verified payment.
- Validate tickets securely and prevent duplicate entry.
- Provide dashboards for organizers and administrators.

## Technology Stack

- **Frontend:** React.js + TypeScript
- **Backend:** NestJS + TypeScript + Prisma ORM
- **Database:** PostgreSQL
- **Cache:** Redis (optional)
- **API Documentation:** Swagger / OpenAPI 3.0
- **Deployment:** Docker + Docker Compose + Nginx + HTTPS

## Team

| Member | Role |
|---|---|
| SRENG Sophea | Project Manager |
| THA Channthy | Backend Engineer |
| LORN DaVid | Backend Engineer |
| NETHNIB Sovannarath | Frontend Developer |
| THAI Phanet | QA & DevOps Specialist |

## Project Structure

- `frontend/` — React application
- `backend/` — NestJS REST API (modular architecture, Prisma ORM, health checks)
- `docs/` — Requirements, architecture, and API documentation
- `infra/` — Deployment and infrastructure configuration
- `docker-compose.yml` — Containerized PostgreSQL database

## Quick Start (Backend)

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended; v20/v22/v24 supported)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [PostgreSQL](https://www.postgresql.org/) (v14+) or [Docker](https://www.docker.com/)

### 1. Database Setup

Using Docker Compose:
```bash
docker compose up -d postgres
```

Or configure your existing local PostgreSQL instance and ensure a database named `eticket` exists.

### 2. Environment Configuration

Copy the example environment file:
```bash
# In the repository root
cp .env.example .env

# And inside the backend directory
cd backend
cp .env.example .env
```

Configure your PostgreSQL connection string in `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eticket?schema=public"
PORT=4000
API_PREFIX=api/v1
CORS_ORIGIN=*
NODE_ENV=development
```

### 3. Install Dependencies & Initialize Database

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed    # Optional: seeds sample event and ticket data
```

### 4. Running the Application

```bash
# Development mode with hot-reload
npm run start:dev

# Production build and run
npm run build
npm run start:prod
```

### 5. Verify API Health & Documentation

- **Health Check Endpoint:** [http://localhost:4000/health](http://localhost:4000/health)
  - Returns overall API health, uptime, and PostgreSQL connectivity with latency metrics.
- **Swagger API Documentation:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
  - Interactive OpenAPI UI for exploring and testing endpoints.

### 6. Running Tests

```bash
# Unit tests
npm run test

# End-to-end (e2e) tests
npm run test:e2e
```

## Available API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check (API status & PostgreSQL connectivity) |
| `GET` | `/api/v1/events` | List all events (supports `?category=` and `?status=`) |
| `GET` | `/api/v1/events/:id` | Get event details by ID |
| `POST` | `/api/v1/events` | Create a new event |
| `PATCH` | `/api/v1/events/:id` | Update an existing event |
| `DELETE` | `/api/v1/events/:id` | Delete an event |
| `POST` | `/api/v1/tickets/types` | Create ticket tiers (VIP, Standard, Early Bird) |
| `GET` | `/api/v1/tickets/types/event/:eventId` | Get ticket types for an event |
| `GET` | `/api/v1/tickets/:code` | Retrieve ticket details by code |
| `POST` | `/api/v1/tickets/validate` | Validate ticket code (QR scanner / duplicate entry prevention) |

## Development Status

- [x] Repository setup and initial structure
- [x] Backend: NestJS REST API with clean, modular architecture
- [x] Backend: PostgreSQL integration via Prisma ORM
- [x] Backend: Health check endpoint (`GET /health`) with DB connectivity verification
- [x] Backend: Global CORS, Validation Pipes, Exception Filters, and Logging Interceptors
- [x] Backend: Swagger / OpenAPI interactive documentation
- [x] Backend: Unit and E2E testing suites
- [ ] Frontend: React application development

## Security

Never commit real passwords, API keys, database credentials, payment secrets, or production environment files to Git. All secrets must be loaded via `.env` files which are excluded by `.gitignore`.
