# Universal E-Ticketing Platform — Frontend

React 18 + TypeScript single-page application built with Vite 6, React Router 6, Tailwind CSS, GSAP, and Motion in an Ivory (`#FAFCFA`), Emerald (`#087F5B`), and Forest (`#064E3B`) design system.

## Features & Routes

### Public & Guest Flows
- **Home (`/`):** Spotlight hero, live event count, category quick links, and upcoming published events.
- **Event Catalog (`/events`):** Searchable, paginated catalog with category, status, date-range, and sort controls.
- **Event Details & Reservation (`/events/:id`):** Tier inventory breakdown, quantity selector, and direct **guest checkout** (name, email, optional phone) or authenticated reservation.
- **For Business (`/organization`):** Organizer landing page showcasing event creation, atomic seat reservation, signed QR passes, and gate check-in workflows.
- **Checkout (`/checkout/:orderId`):** Live reservation countdown timer, guest order token support (`?token=` / `localStorage`), mock payment processing (`SUCCEEDED` / `FAILED`), order cancellation/refund, and instant QR ticket pass rendering.

### Standalone Authentication Flows
- **Sign In (`/login`):** Email/password login, 1-click Quick Role Access demo pills (`ADMIN`, `ORGANIZER`, `SCANNER`, `CUSTOMER`), and Google Sign-In (`useGoogleAuth`).
- **Register (`/register`, `/register/organization`):** Customer and Organization sign-up pages with optional Google Sign-In.

### Authenticated Customer Flows
- **My Tickets (`/my-tickets`):** Digital QR boarding passes (`TicketPassCard`) with full-screen modal view, SVG download, and print support.
- **My Account (`/my-account`):** Profile summary and order history with status badges and checkout/cancellation actions.
- **Ticket Inspection (`/tickets`, `/tickets/:code`):** Authorized ticket lookup for ticket owners, event organizers, assigned scanners, and admins.

### Standalone SaaS Workspaces
- **Gate Scanner (`/scanner`, `/organizer/scanner`):** Event-scoped QR check-in workspace (`SCANNER`, `ORGANIZER`, `ADMIN`) supporting browser camera scanning (`BarcodeDetector` with `jsqr` fallback), manual code entry, and live scan history.
- **Organizer Studio (`/organizer`, `/organizer/events`, `/organizer/events/new`, `/organizer/events/:id/edit`, `/organizer/orders`, `/organizer/attendees`, `/organizer/check-ins`, `/organizer/team`):**
  - Revenue KPIs (gross, refunded, net), donut & bar analytics charts, searchable buyers list, event & ticket tier CRUD, attendee/check-in tables, and gate staff (`SCANNER`) creation/assignment.
- **System Admin Console (`/admin`):** Platform-wide KPIs, revenue & breakdown charts, event moderation, user & role creation/suspension/role updates, and global order/ticket monitors.

## Running Locally

1. Ensure the backend API is running on `http://localhost:4000` (see `../README.md`).
2. Optionally create `frontend/.env` from `frontend/.env.example`:
   - `VITE_API_BASE_URL` — Leave empty in development to use the Vite proxy (`/api` and `/health` -> `http://localhost:4000`), or set to your deployed backend origin.
   - `VITE_GOOGLE_CLIENT_ID` — Optional Google OAuth 2.0 Web Client ID (also fetched dynamically from `GET /api/v1/auth/google/config`).
3. Install dependencies and start the Vite development server:

```bash
cd frontend
npm install
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173).

## Testing, Typecheck & Build

```bash
npm run typecheck   # tsc -b --noEmit
npm test            # Vitest + React Testing Library
npm run build       # tsc -b && vite build
```
