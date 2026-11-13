# E-Ticket Backend API

NestJS REST API for the Universal E-Ticketing Platform, featuring a modular architecture, PostgreSQL integration via Prisma ORM, automated validation, global exception filters, and OpenAPI documentation.

## Architecture & Directory Structure

```text
backend/
├── prisma/
│   ├── schema.prisma       # Database models (User, Event, TicketType, Order, Ticket)
│   └── seed.ts             # Initial database seed script
├── src/
│   ├── common/
│   │   ├── dto/            # Standard response and error DTOs
│   │   ├── filters/        # Global HttpExceptionFilter and AllExceptionsFilter
│   │   └── interceptors/   # Logging and response transform interceptors
│   ├── config/
│   │   ├── configuration.ts # Strongly-typed config loader
│   │   └── env.validation.ts# Joi/Class-validator environment schema validation
│   ├── modules/
│   │   ├── health/         # GET /health endpoint (checks PostgreSQL connectivity)
│   │   ├── prisma/         # Global PrismaService & connection lifecycle
│   │   ├── events/         # Event management REST endpoints
│   │   └── tickets/        # Ticket types and QR validation endpoints
│   ├── app.module.ts       # Root NestJS module
│   └── main.ts             # Application entrypoint (CORS, Pipes, Swagger, Filters)
├── test/
│   ├── app.e2e-spec.ts     # Health endpoint end-to-end integration test
│   └── jest-e2e.json       # E2E test configuration
├── .env.example            # Sample environment variables
├── package.json
└── tsconfig.json
```

## Features

- **Modular NestJS Architecture**: High cohesion, decoupled modules for `Health`, `Prisma`, `Events`, and `Tickets`.
- **Database Integration**: PostgreSQL connected via Prisma ORM with connection pooling and shutdown hooks.
- **GET /health Check**: Real-time connectivity and latency monitoring for PostgreSQL and system uptime.
- **Security & CORS**: Configurable cross-origin resource sharing supporting multiple frontend origins.
- **Input Validation**: Global `ValidationPipe` with auto-transformation, whitelisting, and rejection of non-whitelisted properties.
- **Error Handling**: Unified error response envelope across all HTTP exceptions and unexpected runtime faults.
- **Interactive Swagger Docs**: OpenAPI documentation auto-generated and served at `/api/docs`.
- **Automated Testing**: Complete unit test suite and E2E integration test suite with Jest and Supertest.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `PORT` | HTTP server port | `4000` |
| `API_PREFIX` | Versioned route prefix | `api/v1` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated or `*`) | `*` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/eticket?schema=public` |

## Setup & Running Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL database credentials
```

### 3. Generate Prisma Client & Migrate Schema
```bash
npx prisma generate
npx prisma db push
```

### 4. Optional: Seed Initial Data
```bash
npm run prisma:seed
```

### 5. Start the Server
```bash
# Development (with watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

### 6. Run Tests
```bash
# Unit tests
npm run test

# End-to-end tests
npm run test:e2e
```

## REST API Overview

- **Health Check:** `GET /health`
- **Swagger Docs:** `GET /api/docs`
- **Events:**
  - `GET /api/v1/events`
  - `GET /api/v1/events/:id`
  - `POST /api/v1/events`
  - `PATCH /api/v1/events/:id`
  - `DELETE /api/v1/events/:id`
- **Tickets:**
  - `POST /api/v1/tickets/types`
  - `GET /api/v1/tickets/types/event/:eventId`
  - `GET /api/v1/tickets/:code`
  - `POST /api/v1/tickets/validate`

