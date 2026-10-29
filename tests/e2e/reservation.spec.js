import { expect, test } from '@playwright/test';

const apiBase = 'http://127.0.0.1:5505/api';
const credentials = { email: 'test-admin@example.com', password: 'test-only-password' };
const applicant = (suffix) => ({
  full_name: `Browser Tester ${suffix}`, phone: '09171234567', email: `browser${suffix}@example.com`,
  address: '123 Test Street', city: 'Tagum City', province: 'Davao del Norte', notes: 'Private testing note'
});

async function createSchedule(request, capacity = 3, status = 'Open') {
  const login = await request.post(`${apiBase}/auth/login`, { data: credentials });
  expect(login.ok()).toBeTruthy();
  const { token } = await login.json();
  const response = await request.post(`${apiBase}/orientations`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title: `[TEST] Browser orientation ${Date.now()}`, branch: 'Tagum', venue: 'Test training venue',
      date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      start_time: '09:00 AM', end_time: '12:00 PM', capacity, status
    }
  });
  expect(response.status()).toBe(201);
  return { ...(await response.json()), token };
}

test('direct booking, refresh and reference/phone recovery across devices', async ({ page, request, browser }, testInfo) => {
  const schedule = await createSchedule(request);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/reserve?orientation=${schedule.id}`);
  await expect(page.getByText('Complete Your Reservation', { exact: true })).toBeVisible();
  await page.getByPlaceholder('e.g. Juan Dela Cruz').fill('Browser Test Applicant');
  await page.getByPlaceholder('e.g. 0917 123 4567').fill('09171234567');
  await page.getByPlaceholder('juan@gmail.com').fill(`test${schedule.id}@example.com`);
  await page.getByPlaceholder('House / Unit No., Street, Barangay').fill('123 Test Street');
  await page.getByPlaceholder('e.g. Tagum City').fill('Tagum City');
  await page.getByPlaceholder('e.g. Davao del Norte').fill('Davao del Norte');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Confirm & Reserve Slot' }).click();
  await expect(page).toHaveURL(/\/success\?ref=BGA-/);
  await expect(page.getByRole('heading', { name: /Thank You/ })).toBeVisible();
  await expect(page.getByText('Reservation Confirmed', { exact: true })).toBeVisible();
  const url = new URL(page.url());
  expect([...url.searchParams.keys()]).toEqual(['ref']);
  const reference = url.searchParams.get('ref');
  expect(reference).toMatch(/^BGA-\d{4}-[A-F0-9]{20}$/);
  expect(await page.evaluate((ref) => sessionStorage.getItem(`bga_confirmation_phone:${ref}`), reference)).toBe('09171234567');
  await page.reload();
  await expect(page.getByRole('heading', { name: /Thank You/ })).toBeVisible();
  await expect(page.getByText('09171234567', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('confirmation.png'), fullPage: false });

  const otherDevice = await browser.newContext();
  const recovery = await otherDevice.newPage();
  await recovery.goto(url.toString());
  await expect(recovery.getByRole('button', { name: 'View confirmation' })).toBeVisible();
  await recovery.getByLabel('Reservation phone number').fill('09170000000');
  await recovery.getByRole('button', { name: 'View confirmation' }).click();
  await expect(recovery.getByRole('alert')).toContainText('could not verify');
  await recovery.getByLabel('Reservation phone number').fill('09171234567');
  await recovery.getByRole('button', { name: 'View confirmation' }).click();
  await expect(recovery.getByRole('heading', { name: /Thank You/ })).toBeVisible();
  await otherDevice.close();
  expect(errors).toEqual([]);
});

test('branch links, invalid links and unavailable events fall back to available schedules', async ({ page, request }, testInfo) => {
  const draft = await createSchedule(request, 2, 'Draft');
  await page.goto(`/reserve?orientation=${draft.id}`);
  await expect(page.getByText(/That orientation is unavailable/)).toBeVisible();
  await expect(page.getByText(draft.orientation.title, { exact: true })).toHaveCount(0);
  await page.goto('/reserve?branch=Tagum&program=culinary');
  await expect(page.getByRole('button', { name: 'Tagum', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bacolod', exact: true }).click();
  await expect(page).toHaveURL(/branch=Bacolod/);
  await page.reload();
  await expect(page).toHaveURL(/branch=Bacolod/);
  await page.goto('/reserve?branch=Unknown');
  await expect(page.getByText(/not a recognized BGA branch/)).toBeVisible();
  await page.goto('/reserve');
  await expect(page.getByRole('button', { name: 'Tagum', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('schedules.png'), fullPage: false });
});

test('final seat, duplicate, cancellation release and safe reactivation through API', async ({ request }) => {
  const schedule = await createSchedule(request, 1);
  const results = await Promise.all([1, 2].map((id) => request.post(`${apiBase}/reservations`, { data: { ...applicant(`${schedule.id}-${id}`), phone: `0917000000${id}`, orientation_id: schedule.id } })));
  expect(results.filter((response) => response.status() === 201)).toHaveLength(1);
  expect(results.filter((response) => response.status() === 409)).toHaveLength(1);
  const booked = await results.find((response) => response.status() === 201).json();
  const headers = { Authorization: `Bearer ${schedule.token}` };
  const list = await (await request.get(`${apiBase}/reservations?orientation_id=${schedule.id}`, { headers })).json();
  expect(list).toHaveLength(1);
  const id = list[0].id;
  expect(list[0].reference_number).toBe(booked.reference_number);
  expect((await request.patch(`${apiBase}/reservations/${id}/status`, { headers, data: { status: 'Cancelled' } })).ok()).toBeTruthy();
  const next = await request.post(`${apiBase}/reservations`, { data: { ...applicant(`new${schedule.id}`), orientation_id: schedule.id } });
  expect(next.status()).toBe(201);
  expect((await request.patch(`${apiBase}/reservations/${id}/status`, { headers, data: { status: 'Confirmed' } })).status()).toBe(409);
  const orientation = (await (await request.get(`${apiBase}/orientations`, { headers })).json()).find((row) => row.id === schedule.id);
  expect(orientation.reserved).toBe(1);
  expect(orientation.status).toBe('Fully Booked');
});

test('admin can log in, refresh, see booking and change status', async ({ page, request }) => {
  const schedule = await createSchedule(request);
  const submission = await request.post(`${apiBase}/reservations`, { data: { ...applicant(schedule.id), orientation_id: schedule.id } });
  expect(submission.status()).toBe(201);
  const booking = await submission.json();
  await page.goto('/admin/login');
  await page.getByPlaceholder('admin@example.com').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.getByRole('button', { name: 'Authenticate & Access Portal' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
  await page.reload();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
  await page.goto(`/admin/reservations?orientation_id=${schedule.id}`);
  const row = page.getByRole('row').filter({ hasText: booking.reference_number });
  await expect(row).toBeVisible();
  await expect(row.getByText('Confirmed', { exact: true })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Confirm', exact: true })).toHaveCount(0);
  await row.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(row.getByText('Cancelled', { exact: true })).toBeVisible();
  await row.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(row.getByText('Confirmed', { exact: true })).toBeVisible();
  const lookup = await request.post(`${apiBase}/reservations/confirmation`, { data: { reference_number: booking.reference_number, phone: '09171234567' } });
  expect((await lookup.json()).reservation_status).toBe('Confirmed');
});

test('contact uses real channels and does not pretend to send a form', async ({ page }) => {
  await page.goto('/#contact');
  const contact = page.locator('#contact');
  await expect(contact.getByRole('link', { name: 'Chat on Messenger', exact: true })).toBeVisible();
  await expect(contact.getByRole('link', { name: 'Open email app', exact: true })).toHaveAttribute('href', /^mailto:/);
  await expect(contact.locator('form')).toHaveCount(0);
});

test('admin creates and edits unlimited capacity while public counts stay accurate', async ({ page, request }, testInfo) => {
  await page.goto('/admin/login');
  await page.getByPlaceholder('admin@example.com').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.getByRole('button', { name: 'Authenticate & Access Portal' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
  await page.goto('/admin/orientations');
  await page.getByRole('button', { name: 'Create New Orientation', exact: true }).click();
  await expect(page.getByLabel('Capacity Type')).toHaveValue('limited');
  await expect(page.getByLabel('Max Capacity (Seats)')).toHaveValue('50');
  await page.getByLabel('Capacity Type').selectOption('unlimited');
  await expect(page.getByLabel('Max Capacity (Seats)')).toHaveCount(0);
  const title = `[TEST] Unlimited ${testInfo.project.name} ${Date.now()}`;
  await page.getByPlaceholder('e.g. FREE Saturday Cruise Career Orientation').fill(title);
  await page.getByRole('button', { name: 'Publish Orientation Event', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: title });
  await expect(row.getByText('Unlimited slots', { exact: true })).toBeVisible();
  const login = await (await request.post(`${apiBase}/auth/login`, { data: credentials })).json();
  const headers = { Authorization: `Bearer ${login.token}` };
  const events = await (await request.get(`${apiBase}/orientations`, { headers })).json();
  const event = events.find((item) => item.title === title);
  expect(event.capacity).toBeNull();
  for (const n of [1, 2]) {
    const result = await request.post(`${apiBase}/reservations`, { data: {
      ...applicant(`unlimited-${event.id}-${n}`), phone: `0917000040${n}`, orientation_id: event.id
    } });
    expect(result.status()).toBe(201);
    expect((await result.json()).status).toBe('Confirmed');
  }
  await row.getByTitle('Edit Event', { exact: true }).click();
  await expect(page.getByLabel('Capacity Type')).toHaveValue('unlimited');
  await page.getByLabel('Capacity Type').selectOption('limited');
  await page.getByLabel('Max Capacity (Seats)').fill('1');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(page.getByText('Capacity cannot be lower than the number of active reservations.', { exact: true })).toBeVisible();
  await page.getByLabel('Max Capacity (Seats)').fill('2');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(page.getByLabel('Capacity Type')).toHaveCount(0);
  await expect(row.getByText('Fully Booked', { exact: true })).toBeVisible();
  await row.getByTitle('Edit Event', { exact: true }).click();
  await page.getByLabel('Capacity Type').selectOption('unlimited');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(page.getByLabel('Capacity Type')).toHaveCount(0);
  await page.goto('/reserve?branch=Tagum');
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  const card = page.locator('.surface-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await expect(card.getByText('UNLIMITED SLOTS', { exact: true })).toBeVisible();
  await expect(card.getByText('2 / Unlimited', { exact: true })).toBeVisible();
  await card.screenshot({ path: testInfo.outputPath('unlimited-public-schedule.png'), animations: 'disabled', timeout: 10000 });
});
