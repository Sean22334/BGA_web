import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

test('publishing migration preserves branches, repairs legacy inserts and enforces public/admin RLS', async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  const ADMIN = '10000000-0000-0000-0000-000000000001', USER = '10000000-0000-0000-0000-000000000002';
  async function asRole(role, sql, args = [], user = '') {
    return db.transaction(async (tx) => { await tx.exec(`set local role ${role}`); await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [user]); return tx.query(sql, args); });
  }
  try {
    await db.exec(await readFile(new URL('./fixtures/supabase-schema.sql', import.meta.url), 'utf8'));
    const directory = new URL('../supabase/migrations/', import.meta.url), target = '202611090001_news_alumni_branch_key.sql';
    for (const file of (await readdir(directory)).filter((name) => name.endsWith('.sql') && name !== target).sort()) await db.exec(await readFile(new URL(file, directory), 'utf8'));
    await db.query('insert into auth.users(id,email) values ($1,$2),($3,$4)', [ADMIN, 'admin@example.com', USER, 'user@example.com']);
    await db.query('insert into public.admin_users(user_id) values ($1)', [ADMIN]);
    await db.query("insert into public.cms_branches(branch_key,name) values ('existing-key','Existing branch')");
    await assert.rejects(db.query("insert into public.cms_branches(name) values ('Old frontend')"), { code: '23502' });
    const migration = await readFile(new URL(target, directory), 'utf8');
    await db.exec(migration);
    for (const sql of ["insert into public.cms_branches(name) values ('Same branch') returning branch_key", "insert into public.cms_branches(name,branch_key) values ('Same branch',null) returning branch_key", "insert into public.cms_branches(name,branch_key) values ('Same branch','') returning branch_key"]) assert.match((await asRole('authenticated', sql, [], ADMIN)).rows[0].branch_key, /^branch-/);
    const snapshot = (await db.query('select id,branch_key from public.cms_branches order by id')).rows;
    await db.exec(migration);
    assert.deepEqual((await db.query('select id,branch_key from public.cms_branches order by id')).rows, snapshot);
    assert.equal(new Set(snapshot.map((row) => row.branch_key)).size, snapshot.length);
    await asRole('authenticated', "update public.cms_branches set name='Renamed' where branch_key='existing-key'", [], ADMIN);
    assert.equal((await db.query('select branch_key from public.cms_branches where id=1')).rows[0].branch_key, 'existing-key');
    await assert.rejects(db.query("insert into public.cms_branches(name,branch_key) values ('Duplicate','existing-key')"), { code: '23505' });
    await asRole('authenticated', "insert into public.cms_updates(title) values ('Draft update')", [], ADMIN);
    await asRole('authenticated', "insert into public.cms_alumni(name,batch) values ('Draft alumnus','Private batch')", [], ADMIN);
    for (const table of ['cms_updates','cms_alumni']) {
      for (const [role, user] of [['anon',''],['authenticated',USER]]) {
        assert.equal((await asRole(role, `select * from public.${table}`, [], user)).rows.length, 0);
        await assert.rejects(asRole(role, `insert into public.${table} default values`, [], user), { code: '42501' });
        for (const sql of [`update public.${table} set is_published=true returning id`, `delete from public.${table} returning id`]) {
          const result = await asRole(role, sql, [], user).catch((error) => { assert.equal(error.code, '42501'); return { rows: [] }; });
          assert.equal(result.rows.length, 0);
        }
      }
    }
    await asRole('authenticated', "update public.cms_updates set summary='Summary',cover_image='/test.png',body_json=$1,is_published=true,published_at='2000-01-01' where id=1", [JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Body' }] }] })], ADMIN);
    const date = (await asRole('anon', 'select published_at from public.cms_updates')).rows[0].published_at;
    assert.ok(new Date(date).getFullYear() >= 2026);
    await asRole('authenticated', "update public.cms_updates set title='Edited',published_at='2000-01-01' where id=1", [], ADMIN);
    assert.equal(String((await asRole('anon', 'select published_at from public.cms_updates')).rows[0].published_at), String(date));
    await asRole('authenticated', "update public.cms_alumni set image='/test.png',company='Company',position='Position',batch='Batch 2024',is_published=true where id=1", [], ADMIN);
    assert.deepEqual((await asRole('anon', 'select * from public.cms_alumni_batches()')).rows, [{ batch: 'Batch 2024' }]);
    assert.equal((await asRole('authenticated', 'select * from public.cms_updates', [], USER)).rows.length, 1);
    await asRole('authenticated', 'update public.cms_updates set is_published=false', [], ADMIN);
    assert.equal((await asRole('anon', 'select * from public.cms_updates')).rows.length, 0);
  } finally { await db.close(); }
});
