import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { setTimeout } from 'node:timers/promises';
import { createIsolatedPostgres } from './helpers/postgres.js';

const ADMIN = '10000000-0000-0000-0000-000000000001';
const CUSTOMER = '10000000-0000-0000-0000-000000000002';
const BOOK_SQL = 'select * from public.book_orientation($1, $2, $3, $4, $5, $6, $7, $8)';
let db;
const postgresUrl = process.env.POSTGRES_TEST_URL;

async function asRole(role, sql, params = [], userId = '') {
  assert.ok(['anon', 'authenticated'].includes(role));
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    return tx.query(sql, params);
  });
}

function book({ orientation = 1, phone = '09170000001', email = 'applicant@example.com', role = 'anon', userId = '' } = {}) {
  return asRole(role, BOOK_SQL, [orientation, 'Test Applicant', phone, email, 'Test street', 'Tagum', 'Davao del Norte', 'Private notes'], userId);
}

function status(id, nextStatus, userId = ADMIN) {
  return asRole('authenticated', 'select public.set_reservation_status($1, $2)', [id, nextStatus], userId);
}

async function orientation(id = 1) {
  return (await db.query('select reserved, capacity, status::text from public.orientations where id = $1', [id])).rows[0];
}

describe(`Supabase migrations executed against ${postgresUrl ? 'PostgreSQL (independent connections)' : 'PGlite'}`, () => {
  before(async () => {
    db = postgresUrl
      ? await createIsolatedPostgres(postgresUrl)
      : new PGlite({ extensions: { pgcrypto } });
    await db.exec(await readFile(new URL('./fixtures/supabase-schema.sql', import.meta.url), 'utf8'));
    const migrationDirectory = new URL('../supabase/migrations/', import.meta.url);
    for (const file of (await readdir(migrationDirectory)).filter((name) => name.endsWith('.sql')).sort()) {
      await db.exec(await readFile(new URL(file, migrationDirectory), 'utf8'));
    }
    await db.query('insert into auth.users(id, email) values ($1, $2), ($3, $4)', [ADMIN, 'admin@example.com', CUSTOMER, 'customer@example.com']);
    await db.query('insert into public.admin_users(user_id) values ($1)', [ADMIN]);
  });

  after(async () => { await db?.close(); });

  beforeEach(async () => {
    await db.exec(`
      truncate public.reservations, public.orientations restart identity cascade;
      insert into public.orientations (id, date, status, reserved, capacity) values
        (1, (now() at time zone 'Asia/Manila')::date + 7, 'Open', 0, 2),
        (2, (now() at time zone 'Asia/Manila')::date + 7, 'Draft', 0, 2),
        (3, (now() at time zone 'Asia/Manila')::date + 7, 'Closed', 0, 2),
        (4, (now() at time zone 'Asia/Manila')::date + 7, 'Fully Booked', 2, 2),
        (5, (now() at time zone 'Asia/Manila')::date - 1, 'Open', 0, 2),
        (6, (now() at time zone 'Asia/Manila')::date, 'Open', 0, 2),
        (7, (now() at time zone 'Asia/Manila')::date + 7, 'Published', 0, 2);
      update public.orientations set start_time = '12:00 AM' where id = 6;
      truncate public.cms_programs, public.cms_partners, public.cms_stats, public.site_settings, storage.objects restart identity;
      insert into public.cms_programs (title, is_published) values ('Published', true), ('Draft', false);
      insert into public.cms_partners (title, is_published) values ('Published', 1), ('Draft', 0);
      insert into public.cms_stats (title) values ('Unreviewed legacy statistic');
      insert into public.site_settings values ('contact', '{"email":"admissions@example.com"}');
      insert into storage.objects(bucket_id, name) values ('cms-media', 'test.webp');
    `);
  });

  test('anonymous and ordinary authenticated visitors see only future bookable schedules', async () => {
    for (const [role, userId] of [['anon', ''], ['authenticated', CUSTOMER]]) {
      const result = await asRole(role, 'select id from public.orientations order by id', [], userId);
      assert.deepEqual(result.rows.map((row) => row.id), [1, 7]);
    }
    const adminResult = await asRole('authenticated', 'select id from public.orientations order by id', [], ADMIN);
    assert.equal(adminResult.rows.length, 7);
    for (const id of [2, 3, 4, 5, 6, 999]) {
      await assert.rejects(book({ orientation: id }), /unavailable|no longer available/);
    }
  });

  test('start times use Asia/Manila and invalid dates/times fail closed', async () => {
    const result = await db.query(`select
      public.orientation_starts_at('2030-01-02', '09:00 AM') = '2030-01-02T01:00:00Z'::timestamptz as correct_zone,
      public.orientation_starts_at('2030-01-02', '25:00') is null as invalid_time,
      public.orientation_starts_at('2030-01-02', 'now') is null as ambiguous_time,
      public.orientation_starts_at(null, '09:00 AM') is null as null_date`);
    assert.deepEqual(result.rows[0], { correct_zone: true, invalid_time: true, ambiguous_time: true, null_date: true });
  });

  test('simultaneous final-seat submissions yield one booking and a Fully Booked schedule', async () => {
    await db.exec('update public.orientations set capacity = 1 where id = 1');
    // PGlite serializes its transactions. This verifies atomic SQL behavior for
    // competing submissions; a deployed multi-connection race is a separate check.
    const outcomes = await Promise.allSettled([
      book(), book({ phone: '09170000002', email: 'second@example.com' }),
    ]);
    assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(outcomes.filter((result) => result.status === 'rejected').length, 1);
    assert.deepEqual(await orientation(), { reserved: 1, capacity: 1, status: 'Fully Booked' });
    assert.equal((await db.query('select * from public.reservations')).rows.length, 1);
  });

  test('two PostgreSQL connections actually contend for the final-seat row lock', { skip: !postgresUrl }, async () => {
    await db.exec('update public.orientations set capacity = 1 where id = 1');
    let competitors;
    // Hold the row until BOTH independently connected requests are waiting on
    // database locks, then release it. This forces a real overlapping race.
    await db.transaction(async (tx) => {
      await tx.query('select id from public.orientations where id = 1 for update');
      competitors = Promise.allSettled([
        book(), book({ phone: '09170000002', email: 'second@example.com' }),
      ]);
      let waiting = 0;
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const result = await db.query(`select count(*)::integer as waiting
          from pg_stat_activity
          where datname = current_database() and wait_event_type = 'Lock'
            and query like 'select * from public.book_orientation%'`);
        waiting = result.rows[0].waiting;
        if (waiting === 2) break;
        await setTimeout(20);
      }
      assert.equal(waiting, 2, 'Both booking connections must be waiting on database locks');
    });
    const outcomes = await competitors;
    assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(outcomes.filter((result) => result.status === 'rejected').length, 1);
    assert.deepEqual(await orientation(), { reserved: 1, capacity: 1, status: 'Fully Booked' });
    assert.equal((await db.query('select * from public.reservations')).rows.length, 1);
  });

  test('confirmation lookup requires both reference and phone and never exposes private fields', async () => {
    const booking = (await book()).rows[0];
    assert.match(booking.reference_number, /^BGA-\d{4}-[A-F0-9]{32}$/);
    const confirmation = await asRole('anon', 'select * from public.lookup_reservation_confirmation($1, $2)', [booking.reference_number, '0917-000-0001']);
    assert.deepEqual(confirmation.rows[0], booking);
    assert.deepEqual(Object.keys(booking).sort(), [
      'reference_number', 'full_name', 'reservation_status', 'orientation_title',
      'orientation_branch', 'orientation_venue', 'orientation_date',
      'orientation_start_time', 'orientation_end_time', 'submitted_at',
    ].sort());
    const wrongPhone = await asRole('anon', 'select * from public.lookup_reservation_confirmation($1, $2)', [booking.reference_number, '09170000009']);
    const wrongReference = await asRole('anon', 'select * from public.lookup_reservation_confirmation($1, $2)', ['BGA-NOT-REAL', '09170000001']);
    assert.deepEqual(wrongPhone.rows, []);
    assert.deepEqual(wrongReference.rows, wrongPhone.rows);
  });

  test('duplicate email and formatted phone are rejected without incrementing the count', async () => {
    await book();
    await assert.rejects(book({ phone: '09170000002', email: ' APPLICANT@example.com ' }), { code: '23505' });
    await assert.rejects(book({ phone: '0917-000-0001', email: 'other@example.com' }), { code: '23505' });
    assert.equal((await orientation()).reserved, 1);
    await assert.rejects(book({ phone: '---', email: 'good@example.com' }), { code: '22023' });
    await assert.rejects(book({ phone: '09170000003', email: 'invalid-email' }), { code: '22023' });
  });

  test('cancellation releases one seat, repeated cancellation is idempotent, and reactivation respects capacity', async () => {
    await db.exec('update public.orientations set capacity = 1 where id = 1');
    await book();
    await status(1, 'Cancelled');
    await status(1, 'Cancelled');
    assert.deepEqual(await orientation(), { reserved: 0, capacity: 1, status: 'Open' });
    await status(1, 'Confirmed');
    assert.deepEqual(await orientation(), { reserved: 1, capacity: 1, status: 'Fully Booked' });
    await status(1, 'Cancelled');
    await book({ phone: '09170000002', email: 'second@example.com' });
    await assert.rejects(status(1, 'Pending'), /fully booked/);
    assert.equal((await db.query('select status from public.reservations where id = 1')).rows[0].status, 'Cancelled');
    assert.equal((await orientation()).reserved, 1);
  });

  test('reactivation cannot duplicate an active reservation and null/unknown statuses are rejected', async () => {
    await book();
    await status(1, 'Cancelled');
    await book();
    await assert.rejects(status(1, 'Confirmed'), { code: '23505' });
    await assert.rejects(status(2, null), { code: '22023' });
    await assert.rejects(status(2, 'Arbitrary'), { code: '22023' });
    assert.equal((await orientation()).reserved, 1);
  });

  test('public users cannot read reservations; only allowlisted admins can invoke status changes', async () => {
    await book();
    await assert.rejects(asRole('anon', 'select * from public.reservations'), { code: '42501' });
    assert.deepEqual((await asRole('authenticated', 'select * from public.reservations', [], CUSTOMER)).rows, []);
    await assert.rejects(status(1, 'Confirmed', CUSTOMER), { code: '42501' });
    await status(1, 'Confirmed');
    assert.equal((await asRole('authenticated', 'select * from public.reservations', [], ADMIN)).rows[0].status, 'Confirmed');
    for (const user of [CUSTOMER, ADMIN]) {
      await assert.rejects(asRole('authenticated', "update public.reservations set status = 'Cancelled' where id = 1", [], user), { code: '42501' });
      await assert.rejects(asRole('authenticated', 'delete from public.reservations where id = 1', [], user), { code: '42501' });
    }
    await assert.rejects(asRole('authenticated', 'insert into public.admin_users(user_id) values ($1)', [CUSTOMER], CUSTOMER), { code: '42501' });
    assert.equal((await asRole('authenticated', 'select public.is_admin() as allowed', [], CUSTOMER)).rows[0].allowed, false);
    assert.equal((await asRole('authenticated', 'select public.is_admin() as allowed', [], ADMIN)).rows[0].allowed, true);
  });

  test('ordinary customers cannot edit orientations; admins cannot forge counts or lower capacity below occupied seats', async () => {
    assert.equal((await asRole('authenticated', "update public.orientations set title = 'Unauthorized' where id = 1 returning id", [], CUSTOMER)).rows.length, 0);
    await assert.rejects(asRole('authenticated', "insert into public.orientations(date) values (current_date + 7)", [], CUSTOMER), { code: '42501' });
    await asRole('authenticated', "update public.orientations set title = 'Admin edit' where id = 1", [], ADMIN);
    await assert.rejects(asRole('authenticated', 'update public.orientations set reserved = 1 where id = 1', [], ADMIN), { code: '42501' });
    await book();
    await book({ phone: '09170000002', email: 'second@example.com' });
    await assert.rejects(asRole('authenticated', 'update public.orientations set capacity = 1 where id = 1', [], ADMIN), { code: '23514' });
    assert.deepEqual(await orientation(), { reserved: 2, capacity: 2, status: 'Fully Booked' });
  });

  test('published CMS is public for both sessions; legacy missing flags are private until published by an admin', async () => {
    for (const [role, user] of [['anon', ''], ['authenticated', CUSTOMER]]) {
      for (const table of ['cms_programs', 'cms_partners']) {
        assert.deepEqual((await asRole(role, `select title from public.${table}`, [], user)).rows, [{ title: 'Published' }]);
      }
      assert.deepEqual((await asRole(role, 'select * from public.cms_stats', [], user)).rows, []);
      assert.equal((await asRole(role, 'select * from public.site_settings', [], user)).rows.length, 1);
    }
    assert.equal((await asRole('authenticated', "update public.cms_programs set title = 'Unauthorized' returning id", [], CUSTOMER)).rows.length, 0);
    await assert.rejects(asRole('authenticated', "insert into public.cms_programs(title, is_published) values ('Unauthorized', true)", [], CUSTOMER), { code: '42501' });
    assert.equal((await asRole('authenticated', "update public.site_settings set setting_value = 'Unauthorized' returning setting_key", [], CUSTOMER)).rows.length, 0);
    await asRole('authenticated', 'update public.cms_stats set is_published = true', [], ADMIN);
    assert.equal((await asRole('anon', 'select * from public.cms_stats')).rows.length, 1);
  });

  test('legacy permissive storage policies cannot allow customer CMS writes, while public reads and admin writes work', async () => {
    for (const [role, user] of [['anon', ''], ['authenticated', CUSTOMER]]) {
      assert.equal((await asRole(role, "select * from storage.objects where bucket_id = 'cms-media'", [], user)).rows.length, 1);
      await assert.rejects(asRole(role, "insert into storage.objects(bucket_id, name) values ('cms-media', 'bad.webp')", [], user), { code: '42501' });
      assert.equal((await asRole(role, "update storage.objects set name = 'bad.webp' where bucket_id = 'cms-media' returning id", [], user)).rows.length, 0);
      assert.equal((await asRole(role, "delete from storage.objects where bucket_id = 'cms-media' returning id", [], user)).rows.length, 0);
    }
    await asRole('authenticated', "insert into storage.objects(bucket_id, name) values ('cms-media', 'admin.webp')", [], ADMIN);
    assert.equal((await db.query('select * from storage.objects')).rows.length, 2);
  });

  test('booking rolls back the reservation if updating the seat counter fails', async () => {
    await db.exec(`create function public.test_fail_seat_update() returns trigger language plpgsql as $$
      begin raise exception 'Simulated seat update failure'; end;
    $$;
    create trigger test_fail_seat_update before update on public.orientations
      for each row execute function public.test_fail_seat_update();`);
    try {
      await assert.rejects(book(), /Simulated seat update failure/);
      assert.equal((await db.query('select * from public.reservations')).rows.length, 0);
      assert.equal((await orientation()).reserved, 0);
    } finally {
      await db.exec('drop trigger test_fail_seat_update on public.orientations; drop function public.test_fail_seat_update();');
    }
  });
});
