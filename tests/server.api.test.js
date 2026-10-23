import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createDevelopmentData } from '../shared/developmentData.js';

const cwd = fileURLToPath(new URL('..', import.meta.url));
async function startServer(t, production = false) {
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: production ? 'production' : 'development', PORT: '0',
      BGA_DEV_MEMORY: 'true', DB_HOST: '127.0.0.1', DB_PORT: '1',
      JWT_SECRET: 'test-suite-only-secret-never-use-in-production', ADMIN_EMAIL: 'server-test@example.com', ADMIN_PASSWORD: 'server-test-password' }
  });
  let output = '';
  child.stderr.on('data', (chunk) => { output += chunk; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
      await once(child, 'exit');
    }
  });
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Test server did not start: ${output}`)), 15000);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Test server exited ${code}: ${output}`)); });
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const match = /running on port (\d+)/.exec(output);
      if (match) { clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}/api`); }
    });
  });
  return async (path, { method = 'GET', body, token } = {}) => {
    const response = await fetch(`${base}${path}`, { method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, data: await response.json(), headers: response.headers };
  };
}

test('Express reservation concurrency, confirmation privacy, and admin seat management', { timeout: 30000 }, async (t) => {
  const request = await startServer(t);
  assert.equal((await request('/orientations')).status, 401);
  assert.equal((await request('/reservations')).status, 401);
  assert.equal((await request('/auth/login', { method: 'POST', body: { email: 'server-test@example.com', password: 'wrong' } })).status, 401);
  assert.equal((await request('/auth/login', { method: 'POST', body: { email: {}, password: 'wrong' } })).status, 400);
  const login = await request('/auth/login', { method: 'POST', body: { email: 'server-test@example.com', password: 'server-test-password' } });
  const token = login.data.token;
  assert.equal(login.status, 200);
  assert.equal((await request('/auth/me', { token })).data.admin.email, 'server-test@example.com');
  assert.equal((await request('/auth/me', { token: `${token}invalid` })).status, 403);

  const event = { ...createDevelopmentData().orientations[0], title: 'Concurrency test', capacity: 1, reserved: 0 };
  const created = await request('/orientations', { method: 'POST', token, body: event });
  assert.equal(created.status, 201);
  const eventId = created.data.id;
  const applicant = (n) => ({ orientation_id: eventId, full_name: `Test Applicant ${n}`, phone: `0998000000${n}`, email: `applicant${n}@example.com`, address: 'Demo Address', city: 'Tagum', province: 'Davao del Norte' });
  const race = await Promise.all([1, 2].map((n) => request('/reservations', { method: 'POST', body: applicant(n) })));
  assert.deepEqual(race.map((result) => result.status).sort(), [201, 409]);
  const winnerIndex = race.findIndex((result) => result.status === 201);
  const winner = race[winnerIndex].data;
  const winnerApplicant = applicant(winnerIndex + 1);
  assert.match(winner.reference_number, /^BGA-\d{4}-[A-F0-9]{20}$/);
  const publicList = await request('/orientations/public');
  assert.equal(publicList.data.some((item) => item.id === eventId), false);
  const allEvents = await request('/orientations', { token });
  assert.equal(allEvents.data.find((item) => item.id === eventId).status, 'Fully Booked');

  const recovery = await request('/reservations/confirmation', { method: 'POST', body: { reference_number: winner.reference_number, phone: winnerApplicant.phone } });
  assert.equal(recovery.status, 200);
  assert.equal(recovery.data.full_name, winnerApplicant.full_name);
  assert.equal(recovery.headers.get('cache-control'), 'no-store');
  assert.deepEqual(Object.keys(recovery.data).sort(), ['reference_number', 'full_name', 'reservation_status', 'orientation_title', 'orientation_branch', 'orientation_venue', 'orientation_date', 'orientation_start_time', 'orientation_end_time', 'submitted_at'].sort());
  const wrongPhone = await request('/reservations/confirmation', { method: 'POST', body: { reference_number: winner.reference_number, phone: '09989999999' } });
  const wrongReference = await request('/reservations/confirmation', { method: 'POST', body: { reference_number: 'BGA-NOT-REAL', phone: winnerApplicant.phone } });
  assert.equal(wrongPhone.status, 404);
  assert.deepEqual(wrongPhone.data, wrongReference.data);

  const setStatus = (id, status) => request(`/reservations/${id}/status`, { method: 'PATCH', token, body: { status } });
  assert.equal((await setStatus(winner.reservation_id, 'Cancelled')).status, 200);
  assert.equal((await request('/orientations/public')).data.some((item) => item.id === eventId), true);
  assert.equal((await setStatus(winner.reservation_id, 'Cancelled')).status, 200);
  assert.equal((await setStatus(winner.reservation_id, 'Confirmed')).status, 200);
  assert.equal((await setStatus(winner.reservation_id, 'Cancelled')).status, 200);
  assert.equal((await request('/reservations', { method: 'POST', body: applicant(3) })).status, 201);
  assert.equal((await setStatus(winner.reservation_id, 'Pending')).status, 409);
  const reservations = await request('/reservations', { token });
  assert.equal(reservations.data.find((item) => item.id === winner.reservation_id).status, 'Cancelled');

  const duplicateEvent = await request('/orientations', { method: 'POST', token, body: { ...event, capacity: 5 } });
  const duplicateApplicant = { ...applicant(4), orientation_id: duplicateEvent.data.id };
  const first = await request('/reservations', { method: 'POST', body: duplicateApplicant });
  assert.equal(first.status, 201);
  assert.equal((await request('/reservations', { method: 'POST', body: { ...duplicateApplicant, email: 'different@example.com', phone: '0998-000-0004' } })).status, 409);
  assert.equal((await request('/reservations', { method: 'POST', body: { ...duplicateApplicant, email: duplicateApplicant.email.toUpperCase(), phone: '09980000005' } })).status, 409);
  await setStatus(first.data.reservation_id, 'Cancelled');
  assert.equal((await request('/reservations', { method: 'POST', body: duplicateApplicant })).status, 201);
  assert.equal((await setStatus(first.data.reservation_id, 'Pending')).status, 409);

  for (const overrides of [{ status: 'Draft' }, { status: 'Closed' }, { date: '2000-01-01' }]) {
    const hidden = await request('/orientations', { method: 'POST', token, body: { ...event, ...overrides } });
    assert.equal(hidden.status, 201);
    assert.equal((await request('/reservations', { method: 'POST', body: { ...applicant(5), orientation_id: hidden.data.id } })).status, 409);
  }
});

test('production outage refuses memory fallback even if BGA_DEV_MEMORY is set', { timeout: 30000 }, async (t) => {
  const request = await startServer(t, true);
  assert.equal((await request('/health')).status, 503);
  assert.equal((await request('/orientations/public')).status, 503);
  assert.equal((await request('/auth/login', { method: 'POST', body: { email: 'server-test@example.com', password: 'server-test-password' } })).status, 503);
  assert.equal((await request('/reservations', { method: 'POST', body: {} })).status, 503);
});
