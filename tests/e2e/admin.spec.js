import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { isBookableOrientation, remainingSlots, todayInManila, orientationStartsAt } from '../../shared/reservationRules.js';
import { reservationCsv } from '../../src/lib/reservationCsv.js';

const apiBase = 'http://127.0.0.1:5505/api';
const credentials = { email: 'test-admin@example.com', password: 'test-only-password' };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=', 'base64');
async function apiLogin(request) {
  const response = await request.post(`${apiBase}/auth/login`, { data: credentials });
  expect(response.status()).toBe(200);
  return { Authorization: `Bearer ${(await response.json()).token}` };
}
async function login(page) {
  await page.goto('/admin/login');
  await page.getByPlaceholder('admin@example.com').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.getByRole('button', { name: 'Authenticate & Access Portal' }).click();
  await expect(page).toHaveURL(/\/admin\/(dashboard|cms|reservations|orientations)/);
  const destination = page.url();
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('heading', { name: 'Admin Dashboard', exact: true })).toBeVisible();
  return destination;
}
async function content(request, headers) {
  const response = await request.get(`${apiBase}/admin/content/all`, { headers });
  expect(response.status()).toBe(200);
  return response.json();
}
async function publicContent(request) {
  const response = await request.get(`${apiBase}/content/public`);
  expect(response.status()).toBe(200);
  return response.json();
}
async function createEvent(request, headers, title, branch = 'Tagum', capacity = 5) {
  const response = await request.post(`${apiBase}/orientations`, { headers, data: { title, branch, venue: 'Isolated test venue', date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), start_time: '09:00 AM', end_time: '12:00 PM', capacity, status: 'Open' } });
  expect(response.status()).toBe(201);
  return (await response.json()).id;
}
async function book(request, orientation_id, name, suffix) {
  const response = await request.post(`${apiBase}/reservations`, { data: { orientation_id, full_name: name, phone: `0917${String(suffix).padStart(7, '0').slice(-7)}`, email: `qa${suffix}@example.com`, address: 'Test address', city: 'Tagum, Davao', province: 'Davao del Norte', notes: 'Private QA note' } });
  expect(response.status()).toBe(201);
  return response.json();
}

test.beforeEach(async ({ page, context }) => {
  // No page in this suite can call the configured live Supabase or external resources.
  await context.route('**/*', (route) => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  page.__qaErrors = [];
  page.on('pageerror', (error) => page.__qaErrors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(page.__qaErrors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('protected routes, wrong login, session refresh, expired token, logout and mobile navigation', async ({ page }, testInfo) => {
  await page.goto('/admin/cms');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByPlaceholder('admin@example.com').fill(credentials.email);
  await page.locator('input[type="password"]').fill('incorrect-password');
  await page.getByRole('button', { name: 'Authenticate & Access Portal' }).click();
  await expect(page.getByText(/Invalid email or password/)).toBeVisible();
  expect(await login(page)).toContain('/admin/cms');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Open management menu' }).click();
  await page.getByRole('link', { name: 'Website Content (CMS)', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/cms/);
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await page.goBack();
  await expect(page).toHaveURL(/\/admin\/login/);
  await login(page);
  await page.evaluate(() => localStorage.setItem('bga_admin_token', 'expired-token'));
  await page.reload();
  await expect(page).toHaveURL(/\/admin\/login/);
  expect(await page.evaluate(() => localStorage.getItem('bga_admin_token'))).toBeNull();
});

const collections = [
  { id: 'programs', tab: 'Programs & Courses', add: 'Add New Program', field: 'Title *', save: 'Save Program' },
  { id: 'branches', tab: 'Branches & Locations', add: 'Add New Branch', field: 'Branch Name *', save: 'Save Branch' },
  { id: 'gallery', tab: 'Campus Gallery', add: 'Add Photo', field: 'Photo Title *', save: 'Save Photo', extra: ['Image URL / File', '/images/culinary_lab.jpg'] },
  { id: 'testimonials', tab: 'Testimonials', add: 'Add Testimonial', field: 'Alumni Name *', save: 'Save Testimonial', extra: ['Quote Statement *', 'Isolated test quote'] },
  { id: 'faqs', tab: 'FAQs', add: 'Add FAQ', field: 'Question *', save: 'Save FAQ', extra: ['Answer *', 'Isolated test answer'] },
  { id: 'stats', tab: 'Academy Statistics', add: 'Add statistic', field: 'Label', save: 'Save', simple: true },
  { id: 'partners', tab: 'Partners', add: 'Add partner', field: 'Partner name', save: 'Save', simple: true }
];
for (const spec of collections) test(`CMS ${spec.id}: create draft, edit, publish, ordering, unpublish, delete and public refresh`, async ({ page, request }, testInfo) => {
  const headers = await apiLogin(request);
  const name = `[QA] ${spec.id} ${testInfo.project.name} ${Date.now()}`;
  await login(page);
  await page.goto('/admin/cms');
  await page.getByRole('button', { name: spec.tab, exact: true }).click();
  await page.getByRole('button', { name: spec.add, exact: true }).click();
  const editor = spec.simple ? page.locator('form') : page.getByRole('dialog', { name: 'Content editor' });
  await editor.getByLabel(spec.field, { exact: true }).fill(name);
  if (spec.extra) await editor.getByLabel(spec.extra[0], { exact: true }).fill(spec.extra[1]);
  if (spec.id === 'stats') {
    await editor.getByLabel('Unique key', { exact: true }).fill(`qa_${Date.now()}`);
    await editor.getByLabel('Value', { exact: true }).fill('42');
  }
  const publish = editor.getByRole('checkbox');
  await expect(publish).not.toBeChecked();
  await editor.getByLabel('Display order', { exact: true }).fill('1');
  await editor.getByRole('button', { name: spec.save, exact: true }).click();
  await expect(editor).toHaveCount(0);
  const row = (await content(request, headers))[spec.id].find((item) => [item.title, item.name, item.question, item.label].includes(name));
  expect(row).toBeTruthy();
  expect((await publicContent(request))[spec.id].some((item) => item.id === row.id)).toBeFalsy();
  const card = page.locator(`[data-cms-item="${spec.id}:${row.id}"]`);
  await expect(card).toBeVisible();
  await card.getByRole('button').first().click();
  await editor.getByLabel(spec.field, { exact: true }).fill(`${name} updated`);
  await editor.getByRole('checkbox').check();
  await editor.getByRole('button', { name: spec.save, exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect.poll(async () => (await publicContent(request))[spec.id].some((item) => item.id === row.id)).toBeTruthy();
  const ordered = (await publicContent(request))[spec.id].map((item) => item.display_order);
  expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
  await page.reload();
  await page.getByRole('button', { name: spec.tab, exact: true }).click();
  await card.getByRole('button').first().click();
  await expect(editor.getByLabel(spec.field, { exact: true })).toHaveValue(`${name} updated`);
  await editor.getByRole('checkbox').uncheck();
  await editor.getByRole('button', { name: spec.save, exact: true }).click();
  await expect(editor).toHaveCount(0);
  expect((await publicContent(request))[spec.id].some((item) => item.id === row.id)).toBeFalsy();
  await card.getByRole('button').last().click();
  await page.getByRole('dialog', { name: 'Delete content' }).getByRole('button', { name: /Delete/ }).click();
  await expect(card).toHaveCount(0);
  expect((await content(request, headers))[spec.id].some((item) => item.id === row.id)).toBeFalsy();
});

for (const spec of [
  { tab: 'Hero & Branding', field: 'Main Headline Text', value: 'QA Hero', save: 'Save & Publish Hero', publicId: 'hero_headline', fields: [
    ['Top Announcement Badge Text', 'QA Badge', 'hero_badge'], ['Headline Highlight Text (Gold Gradient)', 'QA Highlight', 'hero_headline_highlight'],
    ['Primary Button CTA Text', 'QA Reserve', 'hero_primary_cta_text'], ['Subheadline Paragraph', 'QA Subheadline', 'hero_subheadline']
  ] },
  { tab: 'About & Mission', field: 'Our Mission Statement', value: 'QA Mission', save: 'Save & Publish About', publicId: 'about_mission_desc', fields: [
    ['Section Badge Title', 'QA Academy', 'about_badge'], ['Section Main Headline', 'QA About', 'about_headline'],
    ['Intro Paragraph', 'QA Introduction', 'about_subheadline'], ['Our Vision Statement', 'QA Vision', 'about_vision_desc']
  ] },
  { tab: 'Contact & Social', field: 'Official Email Address', value: 'qa-isolated@example.com', save: 'Save & Publish Contact', publicId: 'contact_email', fields: [
    ['Headquarters Phone Hotline', '+63 912 000 0000', 'contact_hotline'], ['Official Facebook Page URL', 'https://www.facebook.com/qa-isolated', 'contact_facebook'],
    ['Business Hours Notice', 'QA Hours', 'contact_hours'], ['Google Maps Embed URL (Iframe Src)', 'https://www.google.com/maps/embed?pb=qa', 'contact_map_url'],
    ['Footer Tagline', 'QA Footer', 'footer_tagline']
  ] }
]) test('CMS settings: ' + spec.tab + ' save, reload and public render', async ({ page, request }) => {
  const headers = await apiLogin(request);
  const original = (await content(request, headers)).settings;
  try {
    await login(page);
    await page.goto('/admin/cms');
    await page.getByRole('button', { name: spec.tab, exact: true }).click();
    await page.getByLabel(spec.field, { exact: true }).fill(spec.value);
    for (const [label, value] of spec.fields) await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByRole('button', { name: spec.save, exact: true }).click();
    await expect(page.getByRole('status')).toContainText('saved');
    const saved = (await publicContent(request)).settings;
    expect(saved[spec.publicId]).toBe(spec.value);
    for (const [, value, key] of spec.fields) expect(saved[key]).toBe(value);
    await page.reload();
    await page.getByRole('button', { name: spec.tab, exact: true }).click();
    await expect(page.getByLabel(spec.field, { exact: true })).toHaveValue(spec.value);
    for (const [label, value] of spec.fields) await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
    await page.goto('/');
    await expect(page.getByText(spec.value, { exact: false }).first()).toBeVisible();
  } finally { expect((await request.put(apiBase + '/admin/settings', { headers, data: { settings: original } })).ok()).toBeTruthy(); }
});

test('CMS upload and failed save/load preserve input and allow retry without false success', async ({ page, request }) => {
  const headers = await apiLogin(request);
  await login(page);
  await page.route('**/api/admin/content/all', (route) => route.fulfill({ status: 503, json: { error: 'Test CMS outage' } }));
  await page.goto('/admin/cms');
  await expect(page.getByRole('alert')).toContainText('Test CMS outage');
  await page.unroute('**/api/admin/content/all');
  await page.getByRole('button', { name: 'Retry loading content' }).click();
  await page.getByRole('button', { name: 'Campus Gallery', exact: true }).click();
  await page.getByRole('button', { name: 'Add Photo', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Content editor' });
  const title = `QA upload ${Date.now()}`;
  await editor.getByLabel('Photo Title *', { exact: true }).fill(title);
  await editor.locator('input[type="file"]').setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
  await expect(page.getByRole('alert')).toContainText('Choose a PNG');
  await editor.locator('input[type="file"]').setInputFiles({ name: 'one.png', mimeType: 'image/png', buffer: png });
  await expect(editor.getByLabel('Image URL / File', { exact: true })).toHaveValue(/^\/uploads\/bga_/);
  await page.route('**/api/admin/gallery', (route) => route.fulfill({ status: 503, json: { error: 'Test save outage' } }));
  await editor.getByRole('button', { name: 'Save Photo' }).click();
  await expect(page.getByRole('alert')).toContainText('Test save outage');
  await expect(editor.getByLabel('Photo Title *', { exact: true })).toHaveValue(title);
  expect((await content(request, headers)).gallery.some((row) => row.title === title)).toBeFalsy();
  await page.unroute('**/api/admin/gallery');
  await editor.getByRole('button', { name: 'Save Photo' }).click();
  await expect(editor).toHaveCount(0);
  const item = (await content(request, headers)).gallery.find((row) => row.title === title);
  await expect(page.locator(`[data-cms-item="gallery:${item.id}"] img`)).toHaveJSProperty('naturalWidth', 1);
  const image = await request.get(`http://127.0.0.1:5505${item.image}`);
  expect(image.status()).toBe(200);
  expect(await image.body()).toEqual(png);
  await request.delete(`${apiBase}/admin/gallery/${item.id}`, { headers });
});

test('orientation controls create, edit, duplicate, close/reopen, filter, attendees and delete', async ({ page, request }) => {
  const headers = await apiLogin(request);
  const title = `QA event ${Date.now()}`;
  await login(page);
  await page.goto('/admin/orientations');
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await page.getByRole('button', { name: 'Create New Orientation' }).click();
  await page.getByPlaceholder('e.g. FREE Saturday Cruise Career Orientation').fill(title);
  await page.getByLabel('Max Capacity (Seats)').fill('4');
  await page.getByRole('button', { name: 'Publish Orientation Event' }).click();
  const row = page.getByRole('row').filter({ hasText: title }).first();
  await expect(row).toBeVisible();
  await row.getByTitle('Edit Event', { exact: true }).click();
  await page.getByPlaceholder('e.g. FREE Saturday Cruise Career Orientation').fill(`${title} edited`);
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(row).toContainText(`${title} edited`);
  await row.getByTitle('Duplicate Event', { exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Duplicate Event', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: `${title} edited (Copy)` })).toContainText('Draft');
  const original = page.getByRole('row').filter({ hasText: `${title} edited` }).filter({ hasNotText: '(Copy)' });
  await original.getByTitle(/Close/).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close Event' }).click();
  await expect(original).toContainText('Closed');
  await original.getByTitle(/Reopen/).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reopen Event' }).click();
  await expect(original).toContainText('Open');
  await page.getByLabel('Event status').selectOption('Draft');
  await page.getByPlaceholder('Search by title, venue...').fill(title);
  await expect(page.getByRole('row').filter({ hasText: title })).toHaveCount(1);
  await page.getByLabel('Event branch').selectOption('Bacolod');
  await expect(page.getByText('No orientation events found.')).toBeVisible();
  await page.getByLabel('Event branch').selectOption('All');
  await page.getByLabel('Event status').selectOption('All');
  await original.getByTitle('View Attendee List').click();
  await expect(page).toHaveURL(/orientation_id=/);
  await expect(page.getByLabel('Reservation orientation')).not.toHaveValue('All');
  await page.goto('/admin/orientations');
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await page.getByPlaceholder('Search by title, venue...').fill(title);
  await original.getByTitle('Delete Event', { exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Yes, Delete Event' }).click();
  await expect(original).toHaveCount(0);
  const remaining = await (await request.get(`${apiBase}/orientations`, { headers })).json();
  for (const event of remaining.filter((item) => item.title.startsWith(title))) await request.delete(`${apiBase}/orientations/${event.id}`, { headers });
});

test('reservation combined filters, details, CSV, cancellation/reactivation and dashboard counts', async ({ page, request }, testInfo) => {
  const headers = await apiLogin(request);
  const event = await createEvent(request, headers, `QA reservation ${Date.now()}`, 'Butuan', null);
  const name = `José "Pepe", QA ${testInfo.project.name}`;
  const booking = await book(request, event, name, Date.now());
  await login(page);
  await page.getByLabel('Dashboard branch').selectOption('Butuan');
  const rows = await (await request.get(`${apiBase}/reservations?branch=Butuan`, { headers })).json();
  const events = await (await request.get(`${apiBase}/orientations?branch=Butuan`, { headers })).json();
  const metric = (label) => page.locator(`[data-metric="${label}"] [data-metric-value]`);
  const expected = {
    'Total Reservations': rows.length,
    "Today's Reservations": rows.filter((row) => todayInManila(new Date(row.created_at)) === todayInManila()).length,
    'Upcoming Orientations': events.filter((item) => ['Open', 'Published', 'Fully Booked'].includes(item.status) && orientationStartsAt(item) > Date.now()).length,
    'Active Orientation Events': events.filter((item) => ['Open', 'Published'].includes(item.status) && orientationStartsAt(item) > Date.now()).length,
    'Pending Requests': rows.filter((row) => row.status === 'Pending').length,
    'Confirmed Attendees': rows.filter((row) => row.status === 'Confirmed').length,
    'Cancelled Requests': rows.filter((row) => row.status === 'Cancelled').length,
    'Available Slots': events.filter((item) => isBookableOrientation(item)).some((item) => item.capacity === null) ? 'Unlimited' : events.filter((item) => isBookableOrientation(item)).reduce((sum, item) => sum + remainingSlots(item), 0)
  };
  for (const [label, value] of Object.entries(expected)) await expect(metric(label)).toHaveText(String(value));
  await page.goto('/admin/reservations');
  await page.getByLabel('Reservation branch').selectOption('Butuan');
  await page.getByLabel('Reservation orientation').selectOption(String(event));
  await page.getByLabel('Reservation status').selectOption('Confirmed');
  await page.getByPlaceholder('Search name, ref code, phone...').fill(booking.reference_number);
  const row = page.getByRole('row').filter({ hasText: booking.reference_number });
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: 'View Details' }).click();
  const details = page.getByRole('dialog', { name: 'Reservation details' });
  await expect(details).toContainText('Private QA note');
  await details.getByRole('button', { name: 'Close', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const file = await download;
  const filtered = await (await request.get(`${apiBase}/reservations?orientation_id=${event}&status=Confirmed&search=${booking.reference_number}`, { headers })).json();
  expect(await readFile(await file.path(), 'utf8')).toBe(reservationCsv(filtered));
  await row.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(row).toHaveCount(0);
  await page.getByLabel('Reservation status').selectOption('Cancelled');
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(row).toHaveCount(0);
  await page.getByLabel('Reservation status').selectOption('All');
  await expect(row).toContainText('Confirmed');
  await request.delete(`${apiBase}/orientations/${event}`, { headers });
});

test('admin API outages show retryable errors and failed event actions stay open', async ({ page, request }) => {
  const headers = await apiLogin(request);
  const id = await createEvent(request, headers, `QA outage ${Date.now()}`);
  await login(page);
  for (const path of ['dashboard', 'reservations', 'orientations']) {
    await page.route('**/api/orientations?*', (route) => route.fulfill({ status: 503, json: { error: 'Test admin outage' } }));
    await page.goto(`/admin/${path}`);
    await expect(page.getByRole('alert')).toContainText(/temporarily unavailable/);
    await page.unroute('**/api/orientations?*');
    await page.getByRole('button', { name: /Retry loading/ }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await page.route(`**/api/orientations/${id}`, (route) => route.fulfill({ status: 503, json: { error: 'Test deletion outage' } }));
  const row = page.getByRole('row').filter({ hasText: `QA outage` }).last();
  await row.getByTitle('Delete Event', { exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Yes, Delete Event' }).click();
  await expect(dialog.getByRole('alert')).toContainText(/temporarily unavailable/);
  await page.unroute(`**/api/orientations/${id}`);
  await dialog.getByRole('button', { name: 'Yes, Delete Event' }).click();
  await expect(dialog).toHaveCount(0);
});

test('double save submits a CMS draft once while the request is in flight', async ({ page, request }) => {
  const headers = await apiLogin(request);
  await login(page);
  await page.goto('/admin/cms');
  await page.getByRole('button', { name: 'Partners', exact: true }).click();
  await page.getByRole('button', { name: 'Add partner', exact: true }).click();
  const name = `QA single submission ${Date.now()}`;
  await page.getByLabel('Partner name').fill(name);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let calls = 0;
  await page.route('**/api/admin/partners', async (route) => { calls++; await gate; await route.continue(); });
  try {
    await page.locator('form').getByRole('button', { name: 'Save', exact: true }).dblclick();
    await expect(page.locator('form').getByRole('button', { name: 'Saving...' })).toBeDisabled();
  } finally { release(); }
  await expect(page.locator('form')).toHaveCount(0);
  expect(calls).toBe(1);
  const created = (await content(request, headers)).partners.filter((row) => row.name === name);
  expect(created).toHaveLength(1);
  await request.delete(`${apiBase}/admin/partners/${created[0].id}`, { headers });
});

test('a delayed old filter response cannot replace the currently selected branch', async ({ page, request }) => {
  const headers = await apiLogin(request);
  const suffix = Date.now();
  const tagum = await createEvent(request, headers, `QA delayed Tagum ${suffix}`, 'Tagum');
  const butuan = await createEvent(request, headers, `QA current Butuan ${suffix}`, 'Butuan');
  const oldBooking = await book(request, tagum, 'Old filter applicant', suffix);
  const currentBooking = await book(request, butuan, 'Current filter applicant', suffix + 1);
  await login(page);
  await page.goto('/admin/reservations');
  let release, started;
  const gate = new Promise((resolve) => { release = resolve; });
  const oldStarted = new Promise((resolve) => { started = resolve; });
  await page.route('**/api/reservations?*', async (route) => {
    if (new URL(route.request().url()).searchParams.get('branch') === 'Tagum') { started(); await gate; }
    await route.continue();
  });
  try {
    await page.getByLabel('Reservation branch').selectOption('Tagum');
    await oldStarted;
    await page.getByLabel('Reservation branch').selectOption('Butuan');
    await expect(page.getByRole('row').filter({ hasText: currentBooking.reference_number })).toBeVisible();
    const oldFinished = page.waitForResponse((response) => response.url().includes('/api/reservations?') && new URL(response.url()).searchParams.get('branch') === 'Tagum');
    release();
    await oldFinished;
    await expect(page.getByRole('row').filter({ hasText: oldBooking.reference_number })).toHaveCount(0);
    await expect(page.getByRole('row').filter({ hasText: currentBooking.reference_number })).toBeVisible();
  } finally {
    release();
    await request.delete(`${apiBase}/orientations/${tagum}`, { headers });
    await request.delete(`${apiBase}/orientations/${butuan}`, { headers });
  }
});
