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

- **Node.js** 22.12 or later (CI uses Node 22)
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

   Before using the MySQL admin login, create an administrator with a bcrypt hash generated at cost 12 or higher in `admins.password_hash`. The schema does not seed an administrator, and the API does not accept plaintext MySQL passwords.

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
| `VITE_SUPABASE_URL` | Production | Active Supabase project URL for reservations, authentication, and CMS |
| `VITE_SUPABASE_ANON_KEY` | Production | Public anon/publishable key for the same Supabase project; never use a service-role key |
| `VITE_ENABLE_ADMIN` | Production admin portal | Set to `true` at build time to expose the protected admin routes |

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

Before deploying the direct reservation flow, apply these migrations in order:

```text
supabase/migrations/202608270001_direct_reservation_flow.sql
supabase/migrations/202608310001_harden_admin_authorization.sql
supabase/migrations/202609140001_booking_integrity.sql
supabase/migrations/202610230001_complete_cms_collections.sql
supabase/migrations/202610230002_auto_confirm_unlimited_capacity.sql
```

The migrations replace legacy policies, enable RLS, install the atomic booking and confirmation RPCs, and restrict admin operations to an explicit `admin_users` allowlist. Production intentionally does not fall back to browser-local or in-memory writes when the persistent service is unavailable.

New reservations are automatically Confirmed. Admins can choose Limited capacity
(default 50 seats) or Unlimited per orientation. See the
[automatic confirmation and capacity rollout guide](docs/AUTO_CONFIRM_UNLIMITED.md)
before deploying this update; it requires the new database migration and converts
existing Pending bookings for future orientations without changing occupied counts.

After creating the administrator in Supabase Authentication, provision that user once from the Supabase SQL editor:

```sql
insert into public.admin_users (user_id)
select id
from auth.users
where lower(email) = lower('your-admin@example.com')
on conflict (user_id) do nothing;
```

An authenticated Supabase account that is not in `admin_users` cannot enter the admin portal or manage orientation, reservation, CMS, or CMS media records.

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

`npm run build` always uses `NODE_ENV=production`, even when the local `.env` is configured for the development demo. Vercel uses this same command. See [the deployment handoff](docs/DEPLOYMENT.md) for verified checks, remaining production prerequisites, and user-run Git commands.

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
| GET | `/api/orientations` | Admin | List all orientations |
| GET | `/api/orientations/public` | No | List bookable orientations |
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
- MySQL admin passwords must be stored as bcrypt hashes in `admins.password_hash`; plaintext passwords are never accepted by the MySQL login endpoint.
- The in-memory fallback mode is development-only. With `NODE_ENV=production`, the Express API returns `503` instead of reading or writing temporary data when MySQL is unavailable.

## Verification and rollout

See [the rollout checklist](docs/ROLLOUT.md) for migration prerequisites, isolated demo mode, automated tests, and outstanding live verification. A configured Supabase client never silently switches reservation storage after an error, including in development. There are no browser-local reservation writes.

## License

Copyright © Bluechef Global Academy. All rights reserved.

This project is proprietary software. Unauthorized copying, modification, or distribution is prohibited without written permission from Bluechef Global Academy.
