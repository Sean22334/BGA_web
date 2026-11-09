import { expect, test } from '@playwright/test';
import { todayInManila } from '../../shared/reservationRules.js';
import { monthLabel, moveMonth } from '../../shared/calendar.js';

const api = 'http://127.0.0.1:5505/api';
const credentials = { email: 'test-admin@example.com', password: 'test-only-password' };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=', 'base64');
const article = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Approved QA story' }] }] };
async function headers(request) { const response = await request.post(`${api}/auth/login`, { data: credentials }); expect(response.status()).toBe(200); return { Authorization: `Bearer ${(await response.json()).token}` }; }
async function login(page) {
  await page.goto('/admin/login'); await page.getByPlaceholder('admin@example.com').fill(credentials.email); await page.locator('input[type="password"]').fill(credentials.password); await page.getByRole('button', { name: 'Authenticate & Access Portal' }).click();
  await expect(page).toHaveURL(/\/admin\/(dashboard|cms|orientations)/); await page.goto('/admin/dashboard'); await expect(page.getByRole('heading', { name: 'Admin Dashboard', exact: true })).toBeVisible();
}
async function cms(page, tab) { await page.goto('/admin/cms'); await page.getByRole('button', { name: tab, exact: true }).click(); }
async function list(request, kind, auth) { const response = await request.get(`${api}/admin/${kind}`, { headers: auth }); expect(response.status()).toBe(200); return (await response.json()).items; }
async function settings(request, auth) { return (await (await request.get(`${api}/admin/content/all`, { headers: auth })).json()).settings; }
async function restore(request, auth, original) { expect((await request.put(`${api}/admin/settings`, { headers: auth, data: { settings: original } })).ok()).toBeTruthy(); }
test.beforeEach(async ({ page, context }) => {
  await context.route('**/*', (route) => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  page.__publishingErrors = []; page.on('pageerror', (err) => page.__publishingErrors.push(err.message));
});
test.afterEach(async ({ page }) => { expect(page.__publishingErrors).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy(); });

for (const [category, label] of [['news', 'News'], ['event', 'Events'], ['announcement', 'Announcements']]) test(`CMS ${label}: rich text draft, publish, public detail, category and deletion`, async ({ page, request }, info) => {
  const auth = await headers(request), title = `QA ${label} ${info.project.name} ${Date.now()}`, body = 'QA formatted story <script>window.__articleXss=true</script>';
  const before = (await (await request.get(`${api}/orientations`, { headers: auth })).json()).length;
  await login(page); await cms(page, 'News & Updates'); await page.getByRole('button', { name: 'Add update', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Update editor' });
  await editor.getByLabel('Update title').fill(title); await editor.getByLabel('Update category').selectOption(category); await editor.getByLabel('Update summary').fill('Approved QA summary.');
  await editor.getByLabel('Upload cover image').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png });
  await expect(editor.getByLabel('Cover image URL')).toHaveValue(/^\/uploads\//);
  const rich = editor.getByRole('textbox', { name: 'Article body' }); await rich.fill(body); await rich.press('ControlOrMeta+a'); await editor.getByRole('button', { name: 'Bold', exact: true }).click();
  await editor.getByRole('button', { name: category === 'news' ? 'Numbered list' : category === 'event' ? 'Italic' : 'Bullet list', exact: true }).click();
  await editor.getByRole('button', { name: 'Link', exact: true }).click(); await editor.getByLabel('Link URL').fill('javascript:alert(1)'); await editor.getByRole('button', { name: 'Apply link' }).click(); await expect(editor.getByRole('alert')).toContainText('HTTP');
  await editor.getByLabel('Link URL').fill('https://example.com/approved'); await editor.getByRole('button', { name: 'Apply link' }).click();
  await expect(editor.getByLabel('Published on website')).not.toBeChecked(); await editor.getByRole('button', { name: 'Save content', exact: true }).click(); await expect(editor).toHaveCount(0);
  const created = (await list(request, 'updates', auth)).find((item) => item.title === title); expect(created).toBeTruthy();
  expect((await request.get(`${api}/updates/${created.id}`)).status()).toBe(404);
  await page.goto(`/news/${created.id}`); await expect(page.getByRole('heading', { name: 'Update not found' })).toBeVisible();
  await cms(page, 'News & Updates'); const row = page.locator(`[data-publishing-item="updates:${created.id}"]`); await row.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(editor.getByRole('textbox', { name: 'Article body' })).toContainText(body); await editor.getByLabel('Published on website').check(); await editor.getByRole('button', { name: 'Save content', exact: true }).click(); await expect(editor).toHaveCount(0);
  await page.goto('/'); const preview = page.getByRole('region', { name: 'News & Updates', exact: true }); await expect(preview.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await preview.getByRole('link', { name: `Read ${title}`, exact: true }).click(); await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible(); await expect(page.locator('article strong')).toContainText(body); await expect(page.locator('article').getByRole('link', { name: body, exact: true })).toHaveAttribute('href', 'https://example.com/approved');
  expect(await page.evaluate(() => window.__articleXss)).toBeUndefined(); expect((await (await request.get(`${api}/orientations`, { headers: auth })).json()).length).toBe(before);
  await expect(page.locator(`article ${category === 'news' ? 'ol' : category === 'event' ? 'em' : 'ul'}`)).toContainText(body);
  await page.goto('/news'); await page.getByRole('button', { name: label, exact: true }).click(); await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await cms(page, 'News & Updates'); await row.getByRole('button', { name: 'Delete', exact: true }).click(); await page.getByRole('dialog', { name: 'Delete published content' }).getByRole('button', { name: 'Confirm delete' }).click(); await expect(row).toHaveCount(0);
  await page.goto(`/news/${created.id}`); await expect(page.getByRole('heading', { name: 'Update not found' })).toBeVisible();
});

test('alumni photo/name/batch/company/position remain separate from Campus Gallery', async ({ page, request }, info) => {
  const auth = await headers(request), name = `QA Alumni ${info.project.name} ${Date.now()}`;
  const gallery = (await (await request.get(`${api}/content/public`)).json()).gallery;
  await login(page); await cms(page, 'Alumni Album'); await page.getByRole('button', { name: 'Add alumni profile' }).click();
  const editor = page.getByRole('dialog', { name: 'Alumni profile editor' });
  for (const [field, value] of [['Alumni name', name], ['Batch', 'Batch 2030'], ['Current company', 'QA Cruise Company'], ['Current position', 'QA Head Chef']]) await editor.getByLabel(field, { exact: true }).fill(value);
  await editor.getByLabel('Upload profile picture').setInputFiles({ name: 'profile.png', mimeType: 'image/png', buffer: png }); await expect(editor.getByLabel('Profile picture URL')).toHaveValue(/^\/uploads\//); await editor.getByLabel('Display order').fill('2');
  await editor.getByRole('button', { name: 'Save content' }).click(); await expect(editor).toHaveCount(0);
  const created = (await list(request, 'alumni', auth)).find((item) => item.name === name); expect((await (await request.get(`${api}/alumni`)).json()).items.some((item) => item.id === created.id)).toBeFalsy();
  const row = page.locator(`[data-publishing-item="alumni:${created.id}"]`); await row.getByRole('button', { name: 'Edit' }).click(); await editor.getByLabel('Published on website').check(); await editor.getByRole('button', { name: 'Save content' }).click(); await expect(editor).toHaveCount(0);
  await page.goto('/'); const preview = page.getByRole('region', { name: 'Alumni Album', exact: true }); await expect(preview).toContainText(name); await expect(preview).toContainText('Batch 2030'); await expect(preview).toContainText('QA Cruise Company'); await expect(preview).toContainText('QA Head Chef'); await preview.scrollIntoViewIfNeeded(); await expect(preview.getByRole('img', { name, exact: true })).toHaveJSProperty('naturalWidth', 1);
  await preview.getByRole('link', { name: 'View all alumni' }).click(); await page.getByLabel('Filter by batch').selectOption('Batch 2030'); await page.reload(); await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  expect((await (await request.get(`${api}/content/public`)).json()).gallery).toEqual(gallery);
  await cms(page, 'Alumni Album'); await row.getByRole('button', { name: 'Delete' }).click(); await page.getByRole('dialog', { name: 'Delete published content' }).getByRole('button', { name: 'Confirm delete' }).click(); await expect(row).toHaveCount(0);
});

for (const kind of ['updates', 'alumni']) test(`${kind}: preview limits, published pagination and category/batch deep links`, async ({ page, request }, info) => {
  const auth = await headers(request), ids = [], prefix = `QA paged ${kind} ${info.project.name} ${Date.now()}`;
  try {
    for (let i = 0; i < 13; i++) {
      const item = kind === 'updates' ? { title: `${prefix} ${i}`, category: i % 3 === 0 ? 'event' : 'news', summary: 'QA summary', cover_image: '/images/culinary_lab.jpg', body_json: article } : { name: `${prefix} ${i}`, image: '/images/culinary_lab.jpg', batch: i < 10 ? 'Batch 2024' : 'Batch 2025', company: 'QA Company', position: 'QA Position', display_order: 13 - i };
      const response = await request.post(`${api}/admin/${kind}`, { headers: auth, data: { ...item, is_published: true } }); expect(response.status()).toBe(201); ids.push((await response.json()).id);
    }
    await page.goto('/'); const section = page.getByRole('region', { name: kind === 'updates' ? 'News & Updates' : 'Alumni Album', exact: true }); await expect(section.locator('article')).toHaveCount(kind === 'updates' ? 3 : 6);
    await page.goto(kind === 'updates' ? '/news' : '/alumni'); await expect(page.locator('main article')).toHaveCount(12); await page.getByRole('button', { name: 'Next page', exact: true }).click(); await expect(page.locator('main article')).toHaveCount(1); await expect(page).toHaveURL(/page=2/);
    if (kind === 'updates') await page.getByRole('button', { name: 'Events', exact: true }).click(); else await page.getByLabel('Filter by batch').selectOption('Batch 2025');
    await expect(page.locator('main article')).toHaveCount(kind === 'updates' ? 5 : 3); await expect(page).not.toHaveURL(/page=2/); await page.reload(); await expect(page.locator('main article')).toHaveCount(kind === 'updates' ? 5 : 3);
  } finally { for (const id of ids) await request.delete(`${api}/admin/${kind}/${id}`, { headers: auth }); }
});

test('Our History and Why Choose save/edit/reorder, image publication, and intentional empty state', async ({ page, request }) => {
  const auth = await headers(request), original = await settings(request, auth);
  try {
    // Older databases can omit these settings while the public site still shows defaults.
    await page.route('**/api/admin/content/all', async (route) => {
      const response = await route.fetch(), data = await response.json();
      delete data.settings.about_why_title; delete data.settings.about_why_items;
      await route.fulfill({ response, json: data });
    }, { times: 1 });
    await login(page); await cms(page, 'About & Mission'); const history = page.getByRole('region', { name: 'Our History editor' });
    await expect(page.getByRole('region', { name: 'Why Choose editor' }).getByRole('group')).toHaveCount(4);
    await history.getByLabel('Show Our History on the website').check(); await page.getByRole('button', { name: 'Save & Publish About' }).click(); await expect(page.getByRole('alert')).toContainText('Enter the academy history');
    await history.getByLabel('History heading').fill('QA Academy History'); await history.getByLabel('History story').fill('Approved QA academy history.\nA second paragraph.'); await history.getByLabel('Upload history image').setInputFiles({ name: 'history.png', mimeType: 'image/png', buffer: png }); await expect(history.getByLabel('History image URL (optional)')).toHaveValue(/^\/uploads\//);
    const why = page.getByRole('region', { name: 'Why Choose editor' }); await why.getByLabel('Why Choose section title').fill('QA Why Choose'); await why.getByRole('button', { name: 'Add Why Choose card' }).click();
    const card = why.getByRole('group').last(); await card.getByLabel('Card title').fill('QA Added Card'); await card.getByLabel('Card description').fill('Approved QA reason.'); await card.getByLabel('Card icon').selectOption('Anchor');
    await card.getByRole('button', { name: 'Move card up' }).click();
    await page.getByRole('button', { name: 'Save & Publish About' }).click(); await expect(page.getByRole('status')).toContainText('saved');
    await page.goto('/'); const publicHistory = page.getByRole('region', { name: 'Our History', exact: true }); await expect(publicHistory).toContainText('Approved QA academy history.'); await publicHistory.scrollIntoViewIfNeeded(); await expect(publicHistory.getByRole('img')).toHaveJSProperty('naturalWidth', 1);
    const publicWhy = page.getByRole('region', { name: 'Why Choose', exact: true }); await expect(publicWhy.getByRole('heading', { name: 'QA Added Card' })).toBeVisible(); await expect(publicWhy.getByRole('heading', { level: 4 }).nth(3)).toHaveText('QA Added Card');
    await cms(page, 'About & Mission'); await expect(history.getByLabel('History story')).toHaveValue('Approved QA academy history.\nA second paragraph.');
    while (await why.getByRole('group').count()) await why.getByRole('group').first().getByRole('button', { name: 'Remove card' }).click();
    await history.getByLabel('Show Our History on the website').uncheck(); await page.getByRole('button', { name: 'Save & Publish About' }).click(); await expect(page.getByRole('status')).toContainText('saved');
    await page.goto('/'); await expect(page.getByRole('region', { name: 'Why Choose', exact: true })).toHaveCount(0); await expect(page.getByRole('region', { name: 'Our History', exact: true })).toHaveCount(0);
  } finally { await restore(request, auth, { ...original, about_history_enabled: original.about_history_enabled || 'false', about_history_body: original.about_history_body || '', about_history_image: original.about_history_image || '', about_history_title: original.about_history_title || 'Our History' }); }
});

test('calendar default, next/previous year, day creation, multiple events, edit and unchanged bookings', async ({ page, request }, info) => {
  const auth = await headers(request), month = todayInManila().slice(0, 7), next = moveMonth(month, 1), date = `${next}-15`, ids = [], title = `QA calendar ${info.project.name} ${Date.now()}`;
  try {
    for (let i = 0; i < 2; i++) { const response = await request.post(`${api}/orientations`, { headers: auth, data: { title: `${title} ${i}`, branch: 'Tagum', venue: 'QA venue', date, start_time: '09:00 AM', end_time: '12:00 PM', capacity: null, status: i ? 'Draft' : 'Open' } }); expect(response.status()).toBe(201); ids.push((await response.json()).id); }
    const booking = await request.post(`${api}/reservations`, { data: { orientation_id: ids[0], full_name: 'Calendar QA applicant', phone: '09179990001', email: 'calendar-qa@example.com', address: 'QA address', city: 'Tagum', province: 'Davao', notes: '' } }); expect(booking.status()).toBe(201);
    await login(page); await page.goto('/admin/orientations'); await expect(page.getByRole('button', { name: 'Calendar view', exact: true })).toHaveAttribute('aria-pressed', 'true'); await expect(page.getByRole('grid', { name: monthLabel(month), exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next month' }).click(); await expect(page.getByRole('grid', { name: monthLabel(next), exact: true })).toBeVisible();
    await page.getByRole('button', { name: `Create orientation on ${date}`, exact: true }).click(); await expect(page.getByLabel('Orientation date')).toHaveValue(date); await page.getByPlaceholder('e.g. FREE Saturday Cruise Career Orientation').fill(`${title} created`); await page.getByRole('button', { name: 'Publish Orientation Event' }).click(); await expect(page.getByLabel('Orientation date')).toHaveCount(0); await expect(page.getByRole('grid', { name: monthLabel(next), exact: true })).toBeVisible();
    const rows = await (await request.get(`${api}/orientations`, { headers: auth })).json(); ids.push(rows.find((row) => row.title === `${title} created`).id);
    if (info.project.name === 'mobile') { await page.getByRole('button', { name: `View 3 orientations on ${date}`, exact: true }).click(); await page.getByRole('region', { name: 'Selected day orientations' }).getByRole('button').filter({ hasText: `${title} 0` }).click(); }
    else await page.getByRole('button', { name: `Edit ${title} 0 on ${date}`, exact: true }).click();
    await expect(page.getByLabel('Capacity Type')).toHaveValue('unlimited'); await page.getByPlaceholder('e.g. FREE Saturday Cruise Career Orientation').fill(`${title} edited`); await page.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expect(page.getByLabel('Orientation date')).toHaveCount(0);
    await page.getByLabel('Event status').selectOption('Draft'); if (info.project.name === 'mobile') await expect(page.getByRole('button', { name: `View 1 orientations on ${date}`, exact: true })).toBeVisible(); else await expect(page.getByRole('button', { name: `Edit ${title} 1 on ${date}`, exact: true })).toBeVisible();
    await page.getByLabel('Event status').selectOption('All'); await page.getByRole('button', { name: 'Today', exact: true }).click();
    const untilDecember = 12 - Number(month.slice(-2)); for (let i = 0; i <= untilDecember; i++) await page.getByRole('button', { name: 'Next month' }).click(); await expect(page.getByRole('grid', { name: `January ${Number(month.slice(0, 4)) + 1}` })).toBeVisible(); await page.getByRole('button', { name: 'Previous month' }).click(); await expect(page.getByRole('grid', { name: `December ${month.slice(0, 4)}` })).toBeVisible();
    expect((await (await request.get(`${api}/orientations`, { headers: auth })).json()).find((row) => row.id === ids[0]).reserved).toBe(1);
  } finally { for (const id of ids) await request.delete(`${api}/orientations/${id}`, { headers: auth }); }
});

test('new content load/save failures preserve the editor and retry without creating duplicate posts', async ({ page, request }) => {
  const auth = await headers(request), title = `QA retry ${Date.now()}`;
  await login(page);
  await page.route('**/api/admin/updates?*', (route) => route.fulfill({ status: 503, json: { error: 'QA publishing outage' } }));
  await cms(page, 'News & Updates'); await expect(page.getByRole('alert')).toContainText('QA publishing outage');
  await page.unroute('**/api/admin/updates?*'); await page.getByRole('button', { name: 'Retry loading content' }).click(); await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add update', exact: true }).click(); const editor = page.getByRole('dialog', { name: 'Update editor' });
  await editor.getByLabel('Update title').fill(title); await editor.getByRole('textbox', { name: 'Article body' }).fill('Preserve this draft body.');
  await page.route('**/api/admin/updates', (route) => route.fulfill({ status: 503, json: { error: 'QA save outage' } }));
  await editor.getByRole('button', { name: 'Save content' }).click(); await expect(editor.getByRole('alert')).toContainText('QA save outage'); await expect(editor.getByLabel('Update title')).toHaveValue(title); await expect(editor.getByRole('textbox', { name: 'Article body' })).toContainText('Preserve this draft body.');
  expect((await list(request, 'updates', auth)).some((row) => row.title === title)).toBeFalsy();
  await page.unroute('**/api/admin/updates'); await editor.getByRole('button', { name: 'Save content' }).click(); await expect(editor).toHaveCount(0);
  const created = (await list(request, 'updates', auth)).filter((row) => row.title === title); expect(created).toHaveLength(1);
  await page.route('**/api/updates?*', (route) => route.fulfill({ status: 503, json: { error: 'QA public outage' } }));
  await page.goto('/news'); await expect(page.getByRole('alert')).toContainText('QA public outage'); await page.unroute('**/api/updates?*'); await page.getByRole('button', { name: 'Retry loading content' }).click(); await expect(page.getByRole('alert')).toHaveCount(0);
  await request.delete(`${api}/admin/updates/${created[0].id}`, { headers: auth });
});
