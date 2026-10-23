# Vercel deployment handoff - 2026-10-23

Local preparation is complete. The owner applied the pending Supabase rollout
in SQL Editor and supplied successful object checks; subsequent read-only API
checks pass. Deployment remains pending the remaining admin/Vercel checks below
and the owner's Git commit/push. The agent has not committed, pushed, or deployed.

## Verified

- Repository: `https://github.com/Sean22334/BGA_web`; local branch: `master`.
- After `git fetch origin`, local `master` is ahead of `origin/master` by two
  commits: `bb4efff` (direct reservations) and `bc83f4d` (Windows dev shutdown).
- The GitHub repository default branch is `master`. This does not confirm the
  Vercel production branch. Public GitHub deployment records show successful
  Preview deployments for the two local commits and an older Production
  deployment for `509a883`.
- Existing public site: <https://bga-web-indol.vercel.app>. HTTP requests to `/`,
  `/reserve`, `/reserve?branch=Tagum`, `/success?ref=BGA-NONEXISTENT-SCHEMA-CHECK`,
  and `/admin/login` returned HTML with HTTP 200. These are route-delivery checks,
  not proof that booking, login, or database authorization works.
- `npm run check`: strict lint, 32 passing tests, two skipped external database
  tests, and a successful production build. PGlite tests execute all four SQL
  migrations against a synthetic fixture, including authorization and booking
  integrity. Real PostgreSQL/MySQL integration remains for CI/test services.
- `npm run test:e2e`: all 10 desktop/mobile tests passed after dependency updates.
  These tests use isolated fictional development data, not production applicants.
- An admin-enabled production build was also served locally and smoke-tested at
  `/`, `/reserve?branch=Tagum`, the confirmation recovery form, and `/admin/login`.
  With Supabase requests deliberately aborted, it showed the service-unavailable
  message without Express/demo fallback. No JavaScript page errors occurred. This
  did not test a live Supabase booking or successful production admin login.
- `npm audit --audit-level=moderate`: zero reported vulnerabilities after compatible
  dependency updates. Vite is now 8.3.5; concurrently is 10.0.6. The lockfile also
  updates proxy-addr, shell-quote, source-map-js, and related tooling.
- `npm run build` now sets `NODE_ENV=production` before Vite loads environment
  files. The local demo `.env` previously produced a development React bundle.
  The corrected build uses the production JSX runtime; the admin-enabled entry
  bundle is approximately 471 KB before gzip.
- A targeted secret-pattern scan of repository text files and the two outgoing
  commit patches found no suspected private keys or service tokens. Local `.env`
  stays ignored. This is a limited pattern scan, not a comprehensive security audit.
- `git diff --check` passed.
- After the owner's rollout, anonymous empty-select requests to `reservations`
  and `admin_users` both return HTTP 401 / PostgreSQL `42501`, confirming direct
  anonymous reads are denied. Approved-admin and ordinary signed-in user checks
  remain pending.

## Required before pushing to production

1. **Passed:** the owner confirmed `https://joywzpjefzsybizccpne.supabase.co` and
   the existing public key is accepted. After the owner applied the pending SQL,
   `npm run db:check` passes all 10 checks with HTTP 200: confirmation lookup,
   start-time RPC, public orientations, and all seven CMS collections. No applicant
   records were retrieved.
2. Backup availability has not been independently verified. The session has no
   database-owner connection or management token. Preserve a restorable backup
   before any further database change. Do not paste credentials into chat.
3. **Applied by owner:** the pending rollout combines the last two files below.
   The first two migrations' full installed definitions remain unverified; existing
   admin and booking objects were confirmed. Keep migrations in this order for
   future environments; do not rerun them blindly on this project:

   ```text
   202608270001_direct_reservation_flow.sql
   202608310001_harden_admin_authorization.sql
   202609140001_booking_integrity.sql
   202610230001_complete_cms_collections.sql
   ```

   These upgrade an existing schema; do not run `tests/fixtures/supabase-schema.sql`
   or `server/seed-development.sql` against production. If migrations were applied
   manually and are absent from migration history, inspect the installed objects
   first. Do not blindly rerun the integrity migration's constraint/trigger DDL.
   The owner ran the migration-history query in SQL Editor and received `42P01`:
   `supabase_migrations.schema_migrations` does not exist. This confirms that
   history is unavailable, not that application migrations were never applied.
   Before rollout the owner's object checks confirmed existing admin/booking objects
   and four missing integrity/CMS objects. After running the full
   [rollout SQL](sql/deploy-pending.sql), the owner supplied results showing all
   four new object checks as true, followed by a passing API check from this
   workspace. Do not rerun this one-time script. Full installed policy definitions
   and database constraints have not been independently inspected on the live project.
   The new CMS completion migration creates the two missing collections with
   draft defaults and public-read/admin-write policies. Its isolated database test
   verifies sequence privileges, unpublished-row privacy, customer write denial,
   admin CRUD, and preservation of data on reapplication.
4. Confirm the intended Supabase Auth user belongs to `public.admin_users`, using
   the provisioning SQL in the README. Verify anonymous and ordinary signed-in
   users cannot read reservations or manage records. Verify the approved admin
   can manage orientations, reservations, CMS content, and CMS media. Review
   publication flags on existing CMS rows; migrations do not publish drafts.
5. Keep the confirmed project URL and matching public key in local `.env` and
   Vercel, then rerun `npm run db:check` after migrations. It now checks all seven
   CMS collections as well as the read-only booking prerequisites. This check is
   necessary but does not fully verify booking or authorization.
6. In the existing Vercel project's settings, confirm:

   | Setting | Required value |
   | --- | --- |
   | Git repository | `Sean22334/BGA_web` |
   | Production branch | `master` |
   | Root directory | Repository root |
   | Node.js | 22.x or a supported newer version; minimum 22.12 |
   | Install command | `npm ci` |
   | Build command | `npm run build` |
   | Output directory | `dist` |
   | `VITE_SUPABASE_URL` | Active Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Public anon/publishable key for that project |
   | `VITE_ENABLE_ADMIN` | `true` to enable the protected admin routes |
   | `NODE_ENV` | Unset or `production` |
   | `VITE_DEMO_MODE`, `BGA_DEV_MEMORY` | Unset |

   Set required frontend variables for Production and any Preview environment
   used for acceptance testing. Never place database credentials, JWT signing
   secrets, or service-role keys in `VITE_*` variables. Environment changes require
   a new build. The in-app Browser connection failed in this session; dashboard
   direct dashboard access remains unavailable. The owner's screenshots confirm
   the existing Ready Production deployment references `master` / `509a883`, the
   Vite preset is selected, and Root Directory is `./`. Build, output, and install
   overrides are currently off. Set explicit overrides to `npm run build`, `dist`,
   and `npm ci`, respectively, then save. The screenshots also confirm the two
   Supabase variable names are scoped to Production and Preview and
   `VITE_ENABLE_ADMIN` exists for Production; their hidden values remain for the
   owner to verify. The current Git production-branch setting and connected repo
   were not directly inspected in settings.

Production reservations, admin authentication, and CMS use Supabase directly.
The existing `vercel.json` still proxies `/api/*` to Render, but production
reservation/CMS errors deliberately do not switch to Express or demo storage.
This handoff does not deploy the separate Render service.

## Owner-run Git commands

Run these from the repository root after the production prerequisites above pass.
The local `public/uploads/bga_gargantua-black-3840x2160-9621jpg_1792721812542.jpeg`
is confirmed by the owner to be a local test image. Its exact filename is now
Git-ignored and excluded from staging. It remains on disk.

```powershell
git status -sb
git diff --check
git add -- .env.example .gitignore README.md package.json package-lock.json vite.config.js playwright.config.js .github/workflows/ci.yml docs/ROLLOUT.md docs/DEPLOYMENT.md docs/sql/deploy-pending.sql scripts/build.mjs scripts/check-supabase.mjs server/package.json server/schema.sql server/server.js server/reservationDomain.js server/seed-development.sql shared src supabase/migrations tests
git diff --cached --stat
git diff --cached --name-status
git diff --cached --check
git commit -m "Prepare landing page and booking updates for deployment"
git push origin master
git rev-parse HEAD
git ls-remote origin refs/heads/master
git status -sb
```

Review the staged changes before the commit. The local and remote commit hashes
must match after pushing; the unrelated local upload may remain untracked.
If the push is rejected, fetch and inspect the divergence; do not force-push.

## Deployment acceptance and rollback

- Watch the GitHub **Application checks** workflow, including real PostgreSQL
  and MySQL integration tests, and the Vercel build. Vercel auto-deployment may
  start before GitHub checks finish; do not assume CI blocks promotion.
- Confirm the Ready Production deployment references the exact pushed commit,
  and the production domain points to it. A successful Preview alone is insufficient.
- On desktop and mobile, verify the homepage/CMS content, `/reserve`, branch and
  event deep links, and `/admin/login`, including refresh on nested routes.
- Use only a designated test orientation and fictional applicant details for
  booking. Confirm reference-plus-phone recovery on another browser, wrong-phone
  denial, admin visibility/status changes, and cancellation releasing the seat.
  Clean up the test booking through the admin workflow.
- On failure, restore the previous known-good Vercel production deployment, then
  check whether it is compatible with the installed database migrations. A Vercel
  rollback does not roll back Supabase. Do not drop constraints or undo schema/data
  changes without a reviewed recovery procedure and backup.

## Reviewed pending files

The following 69 pending release files are included. Unchanged assets and the
already committed reservation migration travel with Git normally.

```text
.env.example
.github/workflows/ci.yml
.gitignore
README.md
docs/DEPLOYMENT.md
docs/ROLLOUT.md
docs/sql/deploy-pending.sql
package-lock.json
package.json
playwright.config.js
scripts/build.mjs
scripts/check-supabase.mjs
server/package.json
server/reservationDomain.js
server/schema.sql
server/seed-development.sql
server/server.js
shared/developmentData.js
shared/reservationRules.js
src/App.jsx
src/components/AboutUs.jsx
src/components/BookingChrome.jsx
src/components/CmsSimpleCollection.jsx
src/components/ConfirmModal.jsx
src/components/Contact.jsx
src/components/FAQ.jsx
src/components/FloatingMessenger.jsx
src/components/Footer.jsx
src/components/Gallery.jsx
src/components/Hero.jsx
src/components/Navbar.jsx
src/components/Programs.jsx
src/components/ProtectedRoute.jsx
src/components/ReservationDetailsModal.jsx
src/components/Testimonials.jsx
src/components/TrainingCenters.jsx
src/context/AuthContext.jsx
src/context/ContentContext.jsx
src/context/useAuth.js
src/context/useContent.js
src/lib/cmsContent.js
src/lib/supabaseClient.js
src/pages/ReservePage.jsx
src/pages/SuccessPage.jsx
src/pages/admin/AdminDashboard.jsx
src/pages/admin/AdminLayout.jsx
src/pages/admin/AdminLogin.jsx
src/pages/admin/ContentManager.jsx
src/pages/admin/OrientationFormModal.jsx
src/pages/admin/OrientationsList.jsx
src/pages/admin/ReservationsList.jsx
src/services/api.js
src/services/cmsApi.js
src/services/createApi.js
src/services/orientationData.js
supabase/migrations/202608310001_harden_admin_authorization.sql
supabase/migrations/202609140001_booking_integrity.sql
supabase/migrations/202610230001_complete_cms_collections.sql
tests/api.test.js
tests/cms-migration.test.js
tests/cms.test.js
tests/database.test.js
tests/e2e/reservation.spec.js
tests/fixtures/supabase-schema.sql
tests/helpers/postgres.js
tests/server.api.test.js
tests/server.domain.test.js
tests/server.mysql.test.js
vite.config.js
```
