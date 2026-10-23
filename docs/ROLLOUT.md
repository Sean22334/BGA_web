# Reservation hardening: verification and rollout

## Production gates

1. Review and commit the working-tree hardening changes before merging the reservation PR. The old PR alone does not contain these fixes. Local branch integration is not a GitHub merge or deployment.
2. Back up the existing Supabase database. These are upgrade migrations for the existing orientation/reservation schema, not a blank-project bootstrap. Do not execute the test fixture schema against a real project.
3. Apply the migrations from `supabase/migrations` in filename order: `202608270001`, `202608310001`, `202609140001`, then `202610230001`. The final migration creates missing statistics/partners CMS tables with draft defaults and admin-only writes. Use the project's migration history to avoid reapplying previously installed migrations. Database-owner access is required; the browser anon key cannot apply migrations.
4. Create the intended administrator in Supabase Authentication and add their UUID to `public.admin_users` using the SQL in the README. Ordinary authenticated users must not have administrative access.
5. Run `npm run db:check` with the target project's URL and anon key. This only checks service/RPC availability, not complete authorization or capacity correctness.
6. Verify anon direct reservation reads/writes are denied, non-admin authenticated users are denied admin operations, and the approved admin can manage records. Test booking and confirmation recovery against an explicitly designated test orientation. Remove/cancel test reservations afterward using the admin workflow.
7. Create real future orientations through the admin portal, verify venue/contact details, then deploy and smoke-test `/reserve`, branch/event links, and `/success` on desktop/mobile.

Keep database passwords/service-role keys out of chat, Git, and all `VITE_*` variables. Public environment variables are included in the browser bundle. Review existing legacy rows before validating the new `NOT VALID` database constraints; new writes are already constrained.

## Local development

Use Node 22.12 or later and install dependencies from the repository root with `npm ci`.

For Supabase-backed development, configure the real project URL/anon key. A Supabase error is reported without switching to Express or local storage.

For an isolated demo without Supabase/MySQL, set these values in your local `.env`:

```dotenv
NODE_ENV=development
BGA_DEV_MEMORY=true
VITE_DEMO_MODE=true
ADMIN_EMAIL=your-local-test@example.com
ADMIN_PASSWORD=choose-a-local-test-password
JWT_SECRET=choose-a-long-random-local-secret
```

Run `npm run dev`. Demo schedules are generated for future Saturdays in Philippine time; all names and reservations are fictional. Memory resets when the server restarts. Neither demo flag enables memory booking in production. To use Express/MySQL in development instead, disable Supabase via the frontend demo flag but omit `BGA_DEV_MEMORY`, configure MySQL, and provision an admin bcrypt hash. `server/seed-development.sql` is optional and intended only for a development MySQL database.

## Automated checks

Run each command separately in PowerShell:

```powershell
npm run check
npm audit --audit-level=moderate
npx playwright install chromium
npm run test:e2e
```

The default Node tests execute the actual Supabase migrations in isolated PGlite PostgreSQL. Real parallel database connections require `POSTGRES_TEST_URL`; the MySQL integration suite requires `MYSQL_TEST_URL`. Both suites create uniquely named disposable databases and require create/drop-database privileges. Point these variables only at dedicated test database servers, never production. GitHub CI provisions PostgreSQL 17 and MySQL 8.4 for these suites.

Browser tests start isolated development services on ports 5185 and 5505 with fictional credentials/data; they do not modify the configured Supabase project. They cover desktop/mobile booking, reference-plus-phone recovery, invalid links, last-seat races, cancellation/reactivation, admin confirmation, and real contact links. Reports are written to `playwright-report`; screenshots/traces to `test-results` (both Git-ignored).

## Verified locally on 2026-09-14

- Node suite: 31 passed, 2 skipped (external PostgreSQL race and MySQL suites without connection variables).
- Separate isolated PostgreSQL 18 run: all 13 database tests passed, including two independently connected transactions waiting for the final-seat row lock; exactly one booking succeeded.
- Playwright: all 10 desktop/mobile tests passed.
- Strict lint and production build passed; npm audit reported zero vulnerabilities.
- Initial JavaScript bundle reduced from approximately 778 KB to 471 KB through route splitting; this is build size, not a measured field-performance score.

Live Supabase checks could not reach the configured service. Production migrations, live RLS verification, remote PR merge, deployment, and a local real-MySQL run have not been completed. CI is added but has not yet run on GitHub. Passing isolated tests does not establish production readiness.
