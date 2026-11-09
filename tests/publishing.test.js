import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/server.js';
import { richText, publishingPayload, validateAboutSettings } from '../shared/publishingRules.js';
import { createPublishingApi } from '../src/services/createPublishingApi.js';
import { createCmsApi } from '../src/services/createCmsApi.js';
import { monthDays, moveMonth } from '../shared/calendar.js';

const body = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Approved content', marks: [{ type: 'bold' }, { type: 'link', attrs: { href: 'https://example.com' } }] }] }] };
const update = { title: 'QA news', category: 'news', summary: 'QA summary', cover_image: '/images/culinary_lab.jpg', body_json: body };
const alumni = { name: 'QA alumnus', image: '/images/culinary_lab.jpg', batch: 'Batch 2024', company: 'QA Company', position: 'QA Position', display_order: 0 };

test('publishing APIs protect drafts and support categories, pagination, profiles and independent deletion', async (t) => {
  const { request, token } = await startTestServer(t);
  for (const [kind, item] of [['updates', update], ['alumni', alumni]]) await t.test(kind, async () => {
    const route = `/admin/${kind}`;
    for (const [method, suffix] of [['GET', ''], ['POST', ''], ['GET', '/1'], ['PUT', '/1'], ['DELETE', '/1']]) {
      assert.equal((await request(route + suffix, { method, ...(method === 'POST' || method === 'PUT' ? { body: item } : {}) })).status, 401);
      assert.equal((await request(route + suffix, { method, token: 'bad', ...(method === 'POST' || method === 'PUT' ? { body: item } : {}) })).status, 403);
    }
    const created = await request(route, { method: 'POST', token, body: item });
    assert.equal(created.status, 201);
    const id = created.data.id;
    assert.equal((await request(`/${kind}`)).data.total, 0);
    if (kind === 'updates') assert.equal((await request(`/updates/${id}`)).status, 404);
    assert.equal((await request(`${route}/${id}`, { method: 'PUT', token, body: { ...item, is_published: true } })).status, 200);
    const detail = (await request(`${route}/${id}`, { token })).data;
    assert.equal(detail.is_published, true);
    if (kind === 'updates') {
      assert.deepEqual((await request(`/updates/${id}`)).data.body_json, body);
      assert.ok(detail.published_at);
      assert.equal('body_json' in (await request('/updates')).data.items[0], false);
      assert.equal((await request('/updates?category=event')).data.total, 0);
    } else assert.deepEqual((await request('/alumni/batches')).data, ['Batch 2024']);
    const hidden = await request(`${route}/${id}`, { method: 'PUT', token, body: { ...item, is_published: false } });
    assert.equal(hidden.status, 200);
    assert.equal((await request(`/${kind}`)).data.total, 0);
    assert.equal((await request(`${route}/99999`, { method: 'PUT', token, body: item })).status, 404);
    assert.equal((await request(route, { method: 'POST', token, body: { ...item, ...(kind === 'updates' ? { cover_image: '' } : { company: '' }), is_published: true } })).status, 400);
    for (let i = 0; i < 13; i++) assert.equal((await request(route, { method: 'POST', token, body: { ...item, is_published: true, ...(kind === 'updates' ? { title: `QA news ${i}`, category: i === 0 ? 'event' : 'news' } : { name: `QA alumnus ${i}`, batch: i === 0 ? 'Batch 2025' : 'Batch 2024' }) } })).status, 201);
    assert.equal((await request(`/${kind}`)).data.items.length, 12);
    assert.equal((await request(`/${kind}?page=2`)).data.items.length, 1);
    assert.equal((await request(`/${kind}?${kind === 'updates' ? 'category=event' : 'batch=Batch%202025'}`)).data.total, 1);
    assert.equal((await request(`/${kind}?pageSize=100`)).status, 400);
    const all = [...(await request(`${route}?page=1`, { token })).data.items, ...(await request(`${route}?page=2`, { token })).data.items];
    for (const row of all) assert.equal((await request(`${route}/${row.id}`, { method: 'DELETE', token })).status, 200);
    assert.equal((await request(`/${kind}`)).data.total, 0);
  });
  assert.ok((await request('/content/public')).data.gallery.length > 0);
});

test('rich article validation rejects executable formatting and keeps only supported nodes and links', () => {
  assert.deepEqual(richText(body), body);
  for (const invalid of [
    { type: 'doc', content: [{ type: 'script', text: 'alert(1)' }] },
    { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bad', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }] }
  ]) assert.throws(() => richText(invalid));
  assert.throws(() => publishingPayload('updates', { ...update, category: 'other' }));
  assert.throws(() => publishingPayload('updates', { ...update, is_published: true, body_json: { type: 'doc', content: [] } }));
  assert.throws(() => validateAboutSettings({ about_history_enabled: true, about_history_body: '' }));
  assert.doesNotThrow(() => validateAboutSettings({ about_why_items: [] }));
});

test('Supabase branch creates include a key and edits omit the internal key', async () => {
  let payload;
  const chain = { insert(rows) { payload = rows[0]; return this; }, update(row) { payload = row; return this; }, eq() { return this; }, select() { return this; }, then(resolve) { return Promise.resolve({ data: [{ id: 1 }], error: null }).then(resolve); } };
  const api = createCmsApi({ supabase: { from: () => chain } });
  await api.saveCollectionItem('branches', { name: 'QA branch' });
  assert.match(payload.branch_key, /[0-9a-f-]{36}$/);
  await api.saveCollectionItem('branches', { id: 1, name: 'Renamed', branch_key: 'must-not-replace' }, true);
  assert.equal('branch_key' in payload, false);
});

test('standalone branch edits preserve keys even if a client sends a replacement key', async (t) => {
  const { request, token } = await startTestServer(t);
  const created = await request('/admin/branches', { method: 'POST', token, body: { name: 'Branch before rename' } });
  assert.equal(created.status, 201);
  const before = created.data.item;
  assert.equal((await request(`/admin/branches/${before.id}`, { method: 'PUT', token, body: { name: 'Branch after rename', branch_key: 'should-not-replace' } })).status, 200);
  assert.equal((await request('/admin/content/all', { token })).data.branches.find((row) => row.id === before.id).branch_key, before.branch_key);
});

test('publishing Supabase failures never fall back, including draft reads and storage-independent CRUD', async () => {
  const forbidden = () => { throw new Error('Unexpected fallback'); };
  const chain = new Proxy({}, { get: (_target, key) => key === 'then' ? (resolve) => resolve({ error: { message: 'Permission denied' } }) : () => chain });
  const api = createPublishingApi({ supabase: { from: () => chain, rpc: () => chain }, development: true, fetchImpl: forbidden });
  for (const run of [() => api.list('updates'), () => api.getItem('updates', 1), () => api.save('updates', update), () => api.remove('updates', 1), () => api.batches()]) await assert.rejects(run, /Permission denied/);
  await assert.rejects(createPublishingApi({ fetchImpl: forbidden }).list('updates'), /unavailable/);
});

test('calendar dates cross years and leap months without a local-time day shift', () => {
  assert.equal(moveMonth('2026-12', 1), '2027-01');
  assert.equal(moveMonth('2027-01', -1), '2026-12');
  assert.equal(monthDays('2028-02').length, 42);
  assert.ok(monthDays('2028-02').includes('2028-02-29'));
  assert.equal(new Set(monthDays('2028-02')).size, 42);
});

test('Supabase public lists exclude bodies, enforce publication and request a bounded filtered page', async () => {
  const calls = [];
  const chain = new Proxy({}, { get: (_target, key) => key === 'then' ? (resolve) => resolve({ data: [{ id: 1 }], count: 13, error: null }) : (...args) => { calls.push([key, ...args]); return chain; } });
  const api = createPublishingApi({ supabase: { from: (table) => { calls.push(['from', table]); return chain; }, rpc: async () => ({ data: [{ batch: 'Batch 2024' }], error: null }) } });
  const result = await api.list('updates', { category: 'event', page: 2 });
  assert.equal(result.total, 13);
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'is_published' && call[2] === true));
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'category' && call[2] === 'event'));
  assert.ok(calls.some((call) => call[0] === 'range' && call[1] === 12 && call[2] === 23));
  assert.equal(calls.find((call) => call[0] === 'select')[1].includes('body_json'), false);
  calls.length = 0;
  await api.list('updates', { admin: true });
  assert.ok(!calls.some((call) => call[0] === 'eq' && call[1] === 'is_published'));
  assert.deepEqual(await api.batches(), ['Batch 2024']);
});
