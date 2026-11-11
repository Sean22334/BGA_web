import test from 'node:test';
import assert from 'node:assert/strict';
import { createCmsApi } from '../src/services/createCmsApi.js';
import { reservationWorkbook } from '../src/lib/reservationExcel.js';
import { cmsPayload } from '../shared/cmsRules.js';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=';
test('production CMS never falls back to Express or accepts success after Supabase errors', async () => {
  const forbiddenFetch = () => { throw new Error('Unexpected local fallback'); };
  const unavailable = createCmsApi({ fetchImpl: forbiddenFetch });
  for (const run of [() => unavailable.getPublicContent(), () => unavailable.getAdminCMSContent(), () => unavailable.updateSiteSettings({}), () => unavailable.saveCollectionItem('partners', { name: 'Test' }), () => unavailable.deleteCollectionItem('partners', 1), () => unavailable.uploadImage(image)]) await assert.rejects(run, /unavailable/);
  const chain = new Proxy({}, { get: (_target, key) => key === 'then' ? (resolve) => resolve({ error: { message: 'Permission denied' } }) : () => chain });
  const api = createCmsApi({ development: true, fetchImpl: forbiddenFetch, supabase: { from: () => chain, storage: { from: () => chain } } });
  for (const run of [() => api.getPublicContent(), () => api.getAdminCMSContent(), () => api.updateSiteSettings({}), () => api.saveCollectionItem('partners', { name: 'Test' }), () => api.deleteCollectionItem('partners', 1), () => api.uploadImage(image)]) await assert.rejects(run, /Permission denied/);
});

test('CMS payloads strip UI aliases, preserve lists, create keys and validate fields before saving', () => {
  const row = cmsPayload('programs', { title: ' Course ', shortDescription: 'Summary', highlights: '["One"]', created_at: 'ignored', is_published: 'false' }, { creating: true, uniqueId: () => 'unique-test' });
  assert.equal(row.title, 'Course');
  assert.equal(row.short_description, 'Summary');
  assert.deepEqual(row.highlights, ['One']);
  assert.equal(row.program_id, 'program-unique-test');
  assert.equal(row.is_published, false);
  assert.ok(!('created_at' in row));
  for (const input of [{ title: ' ' }, { title: 'Test', display_order: -1 }, { title: 'Test', highlights: 'invalid' }, { title: 'Test', image: 'javascript:alert(1)' }]) assert.throws(() => cmsPayload('programs', input));
});

test('Excel reservation export preserves text, reservation time, orientation date and Branch filtering', () => {
  const workbook = reservationWorkbook([
    { reference_number: 'BGA-2', full_name: 'José "Pepe", Jr.', phone: '09171234567', email: 'test@example.com', city: 'Tagum City', orientation_branch: 'Tagum', created_at: '2026-11-10T17:25:00Z', orientation_date: '2026-11-20', status: 'Confirmed' },
    { reference_number: 'BGA-1', full_name: 'Second applicant', phone: '09170000000', email: 'second@example.com', city: 'Bacolod City', orientation_branch: 'Bacolod', created_at: '2026-11-10T16:25:00Z', orientation_date: '2026-11-18', status: 'Pending' }
  ]);
  const content = new TextDecoder().decode(workbook);
  assert.deepEqual([...workbook.slice(0, 4)], [0x50, 0x4B, 0x03, 0x04]);
  assert.match(content, /Reservation Date/);
  assert.match(content, /Orientation Date/);
  assert.match(content, /<autoFilter ref="A1:I3"\/>/);
  assert.ok(content.indexOf('Bacolod') < content.indexOf('Tagum'));
  assert.match(content, /formatCode="yyyy-mm-dd hh:mm AM\/PM"/);
  assert.match(content, /José &quot;Pepe&quot;, Jr\./);
  assert.match(new TextDecoder().decode(reservationWorkbook([])), /<autoFilter ref="A1:I1"\/>/);
});

test('Supabase CMS writes use table fields and generated keys, and empty update results cannot report success', async () => {
  let payload, rows = [{ id: 1 }], uploaded;
  const chain = {
    insert(value) { payload = value[0]; return this; }, update(value) { payload = value; return this; },
    eq() { return this; }, select() { return this; },
    then(resolve) { return Promise.resolve({ data: rows, error: null }).then(resolve); }
  };
  const api = createCmsApi({ supabase: { from: () => chain, storage: { from: () => ({
    upload: async (path, blob) => { uploaded = { path, blob }; return { error: null }; },
    getPublicUrl: () => ({ data: { publicUrl: 'https://test.invalid/image.png' } })
  }) } } });
  await api.saveCollectionItem('programs', { title: 'Test course', shortDescription: 'Summary', highlights: ['One'], created_at: 'ignore' });
  assert.match(payload.program_id, /^program-/);
  assert.equal(payload.short_description, 'Summary');
  assert.equal(payload.highlights, '["One"]');
  assert.equal('created_at' in payload, false);
  assert.equal('shortDescription' in payload, false);
  rows = [];
  await assert.rejects(api.saveCollectionItem('programs', { title: 'Stale course', id: 1 }, true), /not saved/);
  assert.equal((await api.uploadImage(image, 'misleading.exe')).url, 'https://test.invalid/image.png');
  assert.match(uploaded.path, /^uploads\/bga_[\w-]+\.png$/);
  assert.equal(uploaded.blob.type, 'image/png');
});
