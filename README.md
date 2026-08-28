# Bluechef Global Academy — Landing Page

Official landing page and admissions portal for **Bluechef Global Academy (BGA)**, a TESDA-accredited cruise career training academy in the Philippines. The site includes a public marketing landing page, orientation reservation flow, and a protected admin portal for managing events and reservations.

## Features

- **Marketing landing page** — Hero, programs, training centers, gallery, testimonials, FAQ, and contact sections
- **Orientation reservations** — Public booking flow with branch selection, capacity checks, and confirmation pages
- **Admin portal** — JWT-authenticated dashboard for managing orientations and reservations
- **Production-safe reservations** — Supabase-backed atomic booking, capacity control, RLS, and confirmation recovery
- **Development fallback** — Express/MySQL and local demo data remain available during local development
- **Responsive UI** — Tailwind CSS 4 with Framer Motion animations

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router 7 |
| Styling | Tailwind CSS 4 |
| Forms | React Hook Form, Zod |
| Animation | Framer Motion |
| Backend | Express 5, Node.js |
| Database | MySQL 8 (via mysql2) |
| Production reservations | Supabase Postgres + Auth + RPC/RLS |
| Auth | JSON Web Tokens (jsonwebtoken) |
| Linting | Oxlint |
| Package manager | npm |

## Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later
- **MySQL 8** (optional — the app runs in standalone fallback mode without it)

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd BGA_landing_page
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create your environment file:

   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and set at minimum:

   - `JWT_SECRET` — a long random string (required)
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — for standalone mode when MySQL is not connected

5. *(Optional)* Set up MySQL:

   ```bash
   mysql -u root -p < server/schema.sql
   ```

   Then configure `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in `.env`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Express server port (default: `5000`) |
| `NODE_ENV` | No | `development` or `production` |
| `JWT_SECRET` | **Yes** | Secret key for signing admin JWT tokens |
| `ADMIN_EMAIL` | Standalone mode | Admin email when MySQL is unavailable |
| `ADMIN_PASSWORD` | Standalone mode | Admin password when MySQL is unavailable |
| `DB_HOST` | MySQL mode | MySQL host (default: `localhost`) |
| `DB_PORT` | MySQL mode | MySQL port (default: `3306`) |
| `DB_USER` | MySQL mode | MySQL username |
| `DB_PASSWORD` | MySQL mode | MySQL password |
| `DB_NAME` | MySQL mode | Database name (default: `bga_admissions_db`) |
| `VITE_API_URL` | No | Frontend API base URL (default: `/api`) |

> **Never commit `.env` files.** Only `.env.example` with placeholder values belongs in the repository.

## Running Locally

Start both the frontend and backend together:

```bash
npm run dev
```

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Express) | http://localhost:5000 |
| Admin login | http://localhost:5173/admin/login |

Run services individually:

```bash
npm run client   # Frontend only
npm run server   # Backend only
```

## Direct Reservation Links

The official standalone booking route can be opened without visiting the marketing homepage:

```text
/reserve
/reserve?branch=Tagum
/reserve?orientation=123
```

Branch filters remain in the URL so the links can be shared through Facebook, Messenger, or QR codes. Confirmation pages use `/success?ref=<reference>` and require the matching phone number when reopened on another device.

## Supabase Reservation Migration

Before deploying the direct reservation flow, apply:

```text
supabase/migrations/202608270001_direct_reservation_flow.sql
```

The migration replaces legacy orientation/reservation policies, enables RLS, and installs the atomic booking, safe confirmation lookup, and admin status-change RPCs. Production intentionally does not fall back to browser-local reservations when Supabase is unavailable.

## Build

Build the production frontend:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

The output is written to the `dist/` directory.

## Folder Structure

```
BGA_landing_page/
├── public/              # Static assets (images, favicons)
├── src/
│   ├── assets/          # Component-level assets
│   ├── components/      # Reusable UI components
│   ├── context/         # React context (auth)
│   ├── data/            # Static site content
│   ├── pages/           # Route pages (public + admin)
│   └── services/        # API client and seed data
├── server/
│   ├── server.js        # Express REST API
│   └── schema.sql       # MySQL database schema
├── index.html           # HTML entry point
├── vite.config.js       # Vite + Tailwind + API proxy config
├── package.json         # Dependencies and scripts
└── .env.example         # Environment variable template
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | No | Admin login |
| GET | `/api/orientations` | No | List orientations |
| POST | `/api/orientations` | Admin | Create orientation |
| PUT | `/api/orientations/:id` | Admin | Update orientation |
| PATCH | `/api/orientations/:id/status` | Admin | Change status |
| POST | `/api/orientations/:id/duplicate` | Admin | Duplicate event |
| DELETE | `/api/orientations/:id` | Admin | Delete orientation |
| POST | `/api/reservations` | No | Submit reservation |
| GET | `/api/reservations` | Admin | List reservations |
| PATCH | `/api/reservations/:id/status` | Admin | Update reservation status |

## Screenshots

<!-- Add screenshots here after deployment -->

| Page | Screenshot |
|---|---|
| Landing page | _Coming soon_ |
| Reservation flow | _Coming soon_ |
| Admin dashboard | _Coming soon_ |

## Security Notes

- Set a strong, unique `JWT_SECRET` before deploying to production.
- Replace default admin credentials in `.env` before going live.
- Implement bcrypt password hashing for MySQL admin accounts in production.
- The in-memory fallback mode is intended for local development only.

## License

Copyright © Bluechef Global Academy. All rights reserved.

This project is proprietary software. Unauthorized copying, modification, or distribution is prohibited without written permission from Bluechef Global Academy.
