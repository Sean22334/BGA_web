import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

test('auto-confirm upgrade changes only upcoming Pending bookings and preserves occupied counts', async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    await db.exec(await readFile(new URL('./fixtures/supabase-schema.sql', import.meta.url), 'utf8'));
    const directory = new URL('../supabase/migrations/', import.meta.url);
    const migration = '202610230002_auto_confirm_unlimited_capacity.sql';
    for (const file of (await readdir(directory)).filter((name) => name.endsWith('.sql') && name !== migration).sort()) {
      await db.exec(await readFile(new URL(file, directory), 'utf8'));
    }
    await db.exec(`
      insert into public.orientations(id, date, reserved, capacity) values
        (1, (now() at time zone 'Asia/Manila')::date + 1, 2, 50),
        (2, (now() at time zone 'Asia/Manila')::date - 1, 1, 50);
      insert into public.reservations(orientation_id, reference_number, full_name, phone, email, address, city, province, status) values
        (1, 'UPCOMING', 'Test', '09170000001', 'test1@example.com', 'Test', 'Test', 'Test', 'Pending'),
        (1, 'CANCELLED', 'Test', '09170000002', 'test2@example.com', 'Test', 'Test', 'Test', 'Cancelled'),
        (1, 'CONFIRMED', 'Test', '09170000003', 'test3@example.com', 'Test', 'Test', 'Test', 'Confirmed'),
        (2, 'PAST', 'Test', '09170000004', 'test4@example.com', 'Test', 'Test', 'Test', 'Pending');
    `);
    const rollout = await readFile(new URL('../docs/sql/auto-confirm-unlimited.sql', import.meta.url), 'utf8');
    assert.ok(rollout.includes(await readFile(new URL(migration, directory), 'utf8')));
    const results = await db.exec(rollout);
    assert.deepEqual(results.at(-1).rows[0], {
      unlimited_enabled: true, confirmed_by_default: true, upcoming_pending_converted: true
    });
    const rows = (await db.query('select reference_number, status::text from public.reservations')).rows;
    assert.deepEqual(Object.fromEntries(rows.map((row) => [row.reference_number, row.status])), {
      UPCOMING: 'Confirmed', CANCELLED: 'Cancelled', CONFIRMED: 'Confirmed', PAST: 'Pending'
    });
    assert.deepEqual((await db.query('select reserved, capacity from public.orientations order by id')).rows, [
      { reserved: 2, capacity: 50 }, { reserved: 1, capacity: 50 }
    ]);
    const defaults = (await db.query("select column_default from information_schema.columns where table_schema='public' and table_name='reservations' and column_name='status'")).rows;
    assert.match(defaults[0].column_default, /Confirmed/);
  } finally {
    await db.close();
  }
});
