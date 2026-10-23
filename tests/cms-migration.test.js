import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

test('missing CMS collections migrate safely with draft defaults and admin-only writes', async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  const admin = '10000000-0000-0000-0000-000000000001';
  const customer = '10000000-0000-0000-0000-000000000002';
  async function asRole(role, sql, user = '') {
    return db.transaction(async (tx) => {
      assert.ok(['anon', 'authenticated'].includes(role));
      await tx.exec(`set local role ${role}`);
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [user]);
      return tx.query(sql);
    });
  }
  try {
    await db.exec(await readFile(new URL('./fixtures/supabase-schema.sql', import.meta.url), 'utf8'));
    const directory = new URL('../supabase/migrations/', import.meta.url);
    const newMigration = '202610230001_complete_cms_collections.sql';
    for (const file of (await readdir(directory)).filter((name) => name.endsWith('.sql') && name !== newMigration).sort()) {
      await db.exec(await readFile(new URL(file, directory), 'utf8'));
    }
    await db.exec('drop table public.cms_stats, public.cms_partners');
    const sql = await readFile(new URL(newMigration, directory), 'utf8');
    await db.exec(sql);
    await db.query('insert into auth.users(id, email) values ($1, $2), ($3, $4)', [admin, 'admin@example.com', customer, 'customer@example.com']);
    await db.query('insert into public.admin_users(user_id) values ($1)', [admin]);
    await asRole('authenticated', "insert into public.cms_stats(stat_key, value, label) values ('graduates', '100', 'Graduates')", admin);
    await asRole('authenticated', "insert into public.cms_partners(name) values ('Reviewed partner')", admin);
    // Reapplying this additive migration preserves existing content and flags.
    await db.exec(sql);
    for (const table of ['cms_stats', 'cms_partners']) {
      assert.equal((await asRole('authenticated', `select * from public.${table}`, admin)).rows[0].is_published, false);
      for (const [role, user] of [['anon', ''], ['authenticated', customer]]) {
        assert.equal((await asRole(role, `select * from public.${table}`, user)).rows.length, 0);
        assert.equal((await asRole(role, `update public.${table} set is_published = true returning id`, user).catch((error) => {
          assert.equal(error.code, '42501');
          return { rows: [] };
        })).rows.length, 0);
      }
      await assert.rejects(asRole('authenticated', `insert into public.${table} default values`, customer), { code: '42501' });
      await asRole('authenticated', `update public.${table} set is_published = true`, admin);
      assert.equal((await asRole('anon', `select * from public.${table}`)).rows.length, 1);
      assert.equal((await asRole('authenticated', `select * from public.${table}`, customer)).rows.length, 1);
      await asRole('authenticated', `delete from public.${table}`, admin);
      assert.equal((await asRole('anon', `select * from public.${table}`)).rows.length, 0);
    }
  } finally {
    await db.close();
  }
});
