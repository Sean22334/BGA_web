import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { startTestServer } from './helpers/server.js';

const cases = {
  programs: { title: 'Test program', highlights: ['One'] }, branches: { name: 'Test branch', features: ['Lab'] },
  gallery: { title: 'Test image', image: '/images/culinary_lab.jpg' }, testimonials: { name: 'Tester', quote: 'Test quote' },
  faqs: { question: 'Test question?', answer: 'Test answer' }, stats: { stat_key: 'test_key', value: '25', label: 'Test statistic', icon: 'Award' },
  partners: { name: 'Test partner' }
};
export const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=';

test('all seven CMS collections support protected CRUD, drafts, ordering and authoritative emptiness', async (t) => {
  const { request, token } = await startTestServer(t);
  for (const [collection, item] of Object.entries(cases)) await t.test(collection, async () => {
    const route = `/admin/${collection}`;
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const suffix = method === 'POST' ? '' : '/1';
      assert.equal((await request(route + suffix, { method, body: item })).status, 401);
      assert.equal((await request(route + suffix, { method, body: item, token: 'invalid' })).status, 403);
    }
    const created = await request(route, { method: 'POST', token, body: { ...item, is_published: false, display_order: 200 } });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const id = created.data.id ?? created.data.item?.id;
    assert.ok(id);
    assert.ok((await request('/admin/content/all', { token })).data[collection].some((row) => row.id === id));
    assert.ok(!(await request('/content/public')).data[collection].some((row) => row.id === id), 'draft must stay private');
    const change = { ...item, is_published: true, display_order: 1 };
    assert.equal((await request(`${route}/${id}`, { method: 'PUT', token, body: change })).status, 200);
    const publicRows = (await request('/content/public')).data[collection];
    assert.ok(publicRows.some((row) => row.id === id));
    assert.deepEqual(publicRows.map((row) => row.display_order), publicRows.map((row) => row.display_order).sort((a, b) => a - b));
    assert.equal((await request(`${route}/${id}`, { method: 'PUT', token, body: { ...change, is_published: 'false' } })).status, 200);
    assert.ok(!(await request('/content/public')).data[collection].some((row) => row.id === id));
    assert.equal((await request(route, { method: 'POST', token, body: {} })).status, 400);
    assert.equal((await request(`${route}/${id}`, { method: 'PUT', token, body: { ...change, display_order: -1 } })).status, 400);
    const rows = (await request('/admin/content/all', { token })).data[collection];
    for (const row of rows) assert.equal((await request(`${route}/${row.id}`, { method: 'DELETE', token })).status, 200);
    assert.deepEqual((await request('/content/public')).data[collection], []);
    assert.deepEqual((await request('/admin/content/all', { token })).data[collection], []);
    assert.equal((await request(`${route}/${id}`, { method: 'PUT', token, body: change })).status, 404);
    assert.equal((await request(`${route}/invalid`, { method: 'DELETE', token })).status, 400);
  });
});

test('uploads validate images, require admin, write only to test storage and return readable images', async (t) => {
  const { request, token, base, uploads } = await startTestServer(t);
  assert.equal((await request('/upload', { method: 'POST', body: { imageBase64: png } })).status, 401);
  for (const imageBase64 of ['', 'data:image/png;base64,aGVsbG8=', 'data:image/svg+xml;base64,PHN2Zy8+', 'https://example.com/image.jpg', `data:image/png;base64,${'A'.repeat(7 * 1024 * 1024)}`]) {
    assert.equal((await request('/upload', { method: 'POST', token, body: { imageBase64 } })).status, 400);
  }
  assert.deepEqual(await readdir(uploads), []);
  const result = await request('/upload', { method: 'POST', token, body: { imageBase64: png, filename: '../../anything.exe' } });
  assert.equal(result.status, 200);
  assert.match(result.data.url, /^\/uploads\/bga_[\w-]+\.png$/);
  const response = await fetch(`${base}${result.data.url}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(png.split(',')[1], 'base64'));
});

test('deleted CMS IDs cannot update a replacement record and malformed updates are rejected', async (t) => {
  const { request, token } = await startTestServer(t);
  const route = '/admin/partners';
  const first = await request(route, { method: 'POST', token, body: { name: 'First isolated record' } });
  await request(`${route}/${first.data.id}`, { method: 'DELETE', token });
  const second = await request(route, { method: 'POST', token, body: { name: 'Replacement isolated record' } });
  assert.notEqual(first.data.id, second.data.id);
  assert.equal((await request(`${route}/${first.data.id}`, { method: 'PUT', token, body: { name: 'Stale edit' } })).status, 404);
  assert.equal((await request(`${route}/${second.data.id}`, { method: 'PUT', token, body: [] })).status, 400);
  assert.equal((await request(route, { method: 'POST', token, body: { name: 'Replacement isolated record' } })).status, 409);
  assert.equal((await request('/admin/content/all', { token })).data.partners.find((row) => row.id === second.data.id).name, 'Replacement isolated record');
});
