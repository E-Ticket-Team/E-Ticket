# Universal E-Ticketing Platform — Frontend

React + TypeScript frontend built with Vite and React Router for clean URLs and solid, high-contrast surfaces.

## Features

- **Event Discovery (`/`, `/events`)**: Browse events, search by title/venue/location, and filter by status or category.
- **Event Details (`/events/:id`)**: View full event details, organizer metadata, and live ticket tier availability.
- **Digital Ticket Pass (`/tickets`, `/tickets/:code`)**: Look up any ticket by code and render a scannable QR digital entry pass.
- **Gate Check-In Scanner (`/scanner`)**: Validate tickets (`POST /api/v1/tickets/validate`), prevent duplicate check-ins, and optionally scan QR codes via browser camera.
- **Organizer Studio (`/organizer`, `/organizer/events/new`, `/organizer/events/:id/edit`)**: Full event CRUD, status management, and ticket tier creation.
- **System Status (`/status`)**: Live API & PostgreSQL health monitoring (`GET /health`).

## Running Locally

1. Ensure the backend API is running on `http://localhost:4000` (see `../README.md`).
2. Install dependencies and start the Vite development server:

```bash
cd frontend
npm install
npm run dev
```

3. Open [http://localhost:5173](http://localhost:5173).

## Build & Typecheck

```bash
npm run typecheck
npm run build
```
