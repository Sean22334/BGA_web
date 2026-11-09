# Local admin QA — 2026-11-03

Scope: the whole Admissions admin portal and Website Content CMS, tested with synthetic local data. No production writes, migrations, commits, pushes, or deployments were performed.

## Result

Final local verification passed:

- `npm run check`: lint, **50 tests passed**, **0 failed**, **2 skipped**, and production build passed.
- `npm run test:e2e`: **46 passed**, **0 failed**, across desktop Chromium and Pixel 7 emulation (23 scenarios per project, 7.6 minutes).
- `npm audit --audit-level=moderate`: **0 vulnerabilities**.
- `git diff --check`: passed.

There are no unresolved failures in the listed local scenarios. The two skipped real-database checks and all live integration checks remain unverified, not passed.

## Feature matrix

| Feature | Automated evidence | Status |
|---|---|---|
| Authentication | Protected URLs, incorrect password, return to the requested page, refresh, invalid token, logout/back navigation, mobile menu | Pass — desktop and mobile |
| Dashboard | All eight KPI values against branch-filtered API data, available/unlimited slots, Philippine calendar dates, desktop/mobile overflow | Pass — desktop and mobile |
| Orientation events | Create/edit, Limited/Unlimited, duplicate to Draft, close/reopen, combined filters, attendee link, delete, failed-action retry | Pass — desktop and mobile |
| Reservations | Search, combined branch/event/status filters, details/private notes, cancel/reactivate, seat counts, final-seat race, duplicate applicants | Pass — desktop and mobile |
| CSV export | Download matches filtered records; quotes, commas, Unicode, line breaks and formula-like text are handled | Pass — desktop and mobile |
| CMS settings | Hero/branding, About/Mission, Contact/social text fields: save, refresh, reload and public-page rendering | Pass — desktop and mobile |
| All seven CMS collections | Programs, Branches, Gallery, Testimonials, FAQs, Statistics, Partners: create/edit/delete, drafts, publication, order, public refresh | Pass — desktop and mobile |
| Empty CMS collections | Deleting the final item leaves an empty collection; no sample records are restored | Pass — isolated API regression |
| Images | PNG/JPEG/GIF/WebP validation, 5 MB limit, authorization, isolated storage, readable bytes and browser preview | Pass — desktop and mobile |
| Failure handling | Failed load/save/delete, retry, preserved editor input, no success after a failed request | Pass — desktop and mobile |
| Concurrency in the UI | In-flight double-save submits once; a delayed old filter cannot replace the selected branch | Pass — desktop and mobile |
| Supabase adapter and RLS | Injected client tests for errors/write payloads; SQL authorization/publication tests using PGlite | Pass — local only |
| Real MySQL/PostgreSQL | Existing integration tests, including the added MySQL CMS subtest, require isolated database services | Unverified locally — no test services configured |
| Live Supabase Auth/Storage and production website | Not exercised by this local test scope | Unverified |

## Fixes

- Added protected Statistics and Partners routes. All seven Express CMS collections now share validation, publication, ordering and CRUD behavior.
- Public responses exclude drafts, preserve successful empty collections and report database errors instead of returning sample data.
- Added publication and display-order controls to the five larger editors. New CMS records start as drafts. Successful simple-editor saves close the editor, avoiding accidental repeated creates.
- CMS requests validate content fields and uploads. Supabase requests receive table fields rather than UI aliases, generated keys for new records, and cannot report an empty update result as success.
- Uploaded file extensions follow the validated image type. Filesystem failures report errors. The development `/uploads` proxy makes isolated API uploads viewable from the website origin.
- Admin pages display errors and retry controls, ignore superseded filter responses and keep failed confirmation actions available for retry.
- Reservation details refresh after status changes. CSV exports use a UTF-8 Blob, escape quoted/multiline fields and keep formula-like values as text.
- Dashboard dates use Asia/Manila; past schedules do not inflate upcoming/active counts. Header controls wrap within the screen.

## Reproduce

Run separately in PowerShell from the project folder:

```powershell
npm ci
npm run check
npm audit --audit-level=moderate
npm run test:e2e
git diff --check
```

Playwright starts its own Express memory server and Vite server, with `BGA_DEV_MEMORY=true` and `VITE_DEMO_MODE=true`. The new admin suite blocks requests to hosts other than localhost. Images go to `test-results/cms-uploads`, which teardown removes. API regressions use generated OS temporary directories and remove them afterward. Existing uploaded images are untouched.

The HTML browser report is at `playwright-report/index.html`; failure traces/screenshots and the existing reservation screenshots are under `test-results`. These outputs are ignored by Git.

Local runtime: Node 24.5.0 on Windows. GitHub Actions uses Node 22 and provisions MySQL 8.4/PostgreSQL 17; a local pass does not confirm that remote run.

## MySQL compatibility

Supabase migrations and production configuration are unchanged. For an existing **standalone MySQL** installation, the new CMS Statistics publication control needs `server/migrations/202611030001_cms_statistics_publication.sql` applied to that installation's selected database before using the updated CMS. This additive migration preserves previously public statistics and defaults new rows to drafts; it is safe to reapply. New MySQL databases get the column from `server/schema.sql`.

The migration was added but not applied to any live database. Its real MySQL regression is included in the existing `MYSQL_TEST_URL` integration suite and remains unverified locally when that suite is skipped.

## User-run Git handoff

Review `git diff` and `git status --short`, then stage the reviewed changes:

```powershell
git add -- README.md docs/ADMIN_QA.md playwright.config.js vite.config.js `
  server/server.js server/schema.sql server/cmsRoutes.js server/migrations/202611030001_cms_statistics_publication.sql `
  shared/cmsRules.js src/lib/reservationCsv.js src/services/cmsApi.js src/services/createCmsApi.js `
  src/components/CmsSimpleCollection.jsx src/components/ConfirmModal.jsx src/components/ReservationDetailsModal.jsx `
  src/context/ContentContext.jsx src/pages/admin/AdminDashboard.jsx src/pages/admin/AdminLayout.jsx `
  src/pages/admin/ContentManager.jsx src/pages/admin/OrientationsList.jsx src/pages/admin/ReservationsList.jsx `
  tests/admin-services.test.js tests/cms-api.test.js tests/server.mysql.test.js tests/helpers/server.js `
  tests/e2e/admin.spec.js tests/e2e/cleanup.js
git diff --cached --stat
git commit -m "Fix admin CMS workflows and expand isolated QA coverage"
git push origin master
```

After pushing, check the new **Application checks** run on GitHub. Changes to local tests do not rerun or repair an older workflow run by themselves.
