# Automatic confirmation and unlimited capacity

Successful new bookings are saved as `Confirmed`. Existing Pending reservations
for orientations whose start time is still in the future in Asia/Manila are
converted by the database upgrade. Past bookings and Cancelled records keep
their status. Pending bookings already occupied seats, so this conversion does
not change reservation counts.

## Capacity and APIs

- `capacity` is a positive integer for Limited events or JSON `null` for Unlimited.
  Missing capacity on a partial update preserves the previous setting. New admin
  forms default to Limited / 50 seats; existing capacities are retained.
- `remaining_slots` is a non-negative number for Limited and `null` for Unlimited.
  Unlimited is represented explicitly; no fake large number or JSON Infinity.
- Unlimited events retain actual reserved counts, duplicate checks, future-start
  checks, and Draft/Closed publication controls. They never become Fully Booked
  because of counts. Switching Fully Booked to Unlimited reopens it as Open;
  switching Draft or Closed does not reopen it.
- Switching to a finite limit below occupied seats is rejected. An Open/Published
  event at its finite limit becomes Fully Booked. Booking, cancellation and
  reactivation continue using atomic row locks in the database.
- Confirmation pages show the persisted reservation status and attendance details.
  Historical Pending records and admin cancellation/reactivation remain supported.
  This feature does not send email or SMS notifications.

## Supabase production rollout

1. Verify a restorable backup in the intended Supabase project. The agent does not
   have database-owner access, and has not applied this feature to production.
2. Confirm the preceding migrations through `202610230001` have been applied.
   Do not rerun the older `deploy-pending.sql` script.
3. In SQL Editor, run the whole [transactional rollout script](sql/auto-confirm-unlimited.sql).
   It contains the new `202610230002_auto_confirm_unlimited_capacity.sql` migration
   and returns three boolean checks, all expected to be true. On any error, stop
   and inspect it; do not execute later statements individually. Apply it once.
   Projects using CLI migration history should apply the new migration normally
   instead of separately running this SQL Editor copy.
4. Deploy the frontend promptly after the database change. Existing numeric events
   remain compatible, but only the new app supports Unlimited events. The new
   frontend must not run against the older booking function/schema.
5. On a designated test orientation, verify an automatically Confirmed booking,
   cross-browser reference-plus-phone recovery, counts, cancellation/reactivation,
   and Limited/Unlimited editing. Check a limited last-seat race and an unlimited
   booking beyond the former limit. Do not use actual applicants for testing.
6. Once Unlimited events exist, rolling back only the frontend to an older version
   is unsafe: retain nullable-capacity support. Do not blindly reverse the database
   migration or unconfirm records; a rollback needs a reviewed data recovery plan.

The optional Express/MySQL deployment must apply
`server/migrations/202610230002_auto_confirm_unlimited_capacity.sql` before updating
its server. MySQL ALTER TABLE statements commit independently, so back up first.
New MySQL installations use the updated `server/schema.sql`. Fictional demo
fixtures are confirmed and require no production data changes.

## Verification and Git handoff

Run the normal checks from the repository root:

```powershell
npm run check
npm run test:e2e
```

Database tests include the actual migration, upcoming-Pending conversion without
count changes, concurrent bookings, duplicate rejection, capacity switches,
publication/cutoff rules, and cancellation/reactivation. Browser tests exercise
Limited/Unlimited event creation/editing and persisted confirmation on desktop
and mobile. Real PostgreSQL/MySQL integration tests need dedicated test services;
without their connection variables, those two tests are explicitly skipped.

Local verification on 2026-10-23: lint and production build passed; 36 Node tests
passed and two external-database tests were skipped. All 12 desktop/mobile browser
scenarios passed across runs; the final isolated rerun of the two new capacity
scenarios passed after removing a slow modal screenshot capture and scoping
assertions to the event created by each test. Production migration and live smoke
tests remain pending owner access and deployment.

After the database upgrade and review, the owner can commit/push these feature files:

```powershell
git add -- README.md shared server src supabase/migrations tests docs/AUTO_CONFIRM_UNLIMITED.md docs/sql/auto-confirm-unlimited.sql
git diff --cached --stat
git diff --cached --check
git commit -m "Confirm reservations automatically and support unlimited capacity"
git push origin master
```

The separate untracked password-reset helper and local uploads are outside this
feature and are not included by that staging command. No commit or push is made
by the agent.
