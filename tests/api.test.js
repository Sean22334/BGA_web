import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApi, normalizeConfirmation } from '../src/services/createApi.js';

const calls = [
  ['getOrientations', {}], ['getPublicOrientations', {}], ['createOrientation', {}],
  ['updateOrientation', 1, {}], ['deleteOrientation', 1], ['createReservation', {}],
  ['lookupReservationConfirmation', 'BGA-test', '09170000001'], ['getReservations', 'token'],
  ['updateReservationStatus', 1, 'Confirmed'], ['updateOrientationStatus', 1, 'Open'], ['duplicateOrientation', 1]
];

function mockClient(result) {
  const query = new Proxy({}, { get(_target, key) {
    if (key === 'then') return (resolve, reject) => Promise.resolve(result).then(resolve, reject);
    return () => query;
  } });
  return { from: () => query, rpc: () => Promise.resolve(result) };
}

test('orientation payloads preserve explicit unlimited capacity and omitted partial updates', async () => {
  const writes = [];
  const query = new Proxy({}, { get(_target, key) {
    if (key === 'then') return (resolve) => resolve({ data: { id: 1, capacity: null, reserved: 7 }, error: null });
    return (...args) => { if (key === 'insert' || key === 'update') writes.push(args[0]); return query; };
  } });
  const api = createApi({ supabase: { from: () => query } });
  const created = await api.createOrientation({ capacity: null });
  assert.equal(created.orientation.capacity, null);
  assert.equal(writes[0][0].capacity, null);
  await api.updateOrientation(1, { title: 'Renamed' });
  assert.equal('capacity' in writes[1], false);
  await api.updateOrientation(1, { capacity: '50' });
  assert.equal(writes[2].capacity, 50);
});

test('every production operation fails closed when Supabase is absent', async () => {
  let networkCalls = 0;
  const api = createApi({ fetchImpl: () => { networkCalls++; throw new Error('Unexpected fallback'); } });
  for (const [method, ...args] of calls) await assert.rejects(api[method](...args), /temporarily unavailable/);
  await assert.rejects(api.loginAdmin('admin@example.com', 'password'), /temporarily unavailable/);
  assert.equal(networkCalls, 0);
});

test('returned Supabase errors cannot cause Express or local success, including dev', async () => {
  for (const development of [false, true]) {
    let networkCalls = 0;
    const api = createApi({ development, supabase: mockClient({ error: { message: 'Service down', code: '500' } }), fetchImpl: () => { networkCalls++; } });
    for (const [method, ...args] of calls) await assert.rejects(api[method](...args), /temporarily unavailable/);
    assert.equal(networkCalls, 0);
  }
});

test('development validation failures are shown and never converted into a local reservation', async () => {
  let count = 0;
  const api = createApi({ development: true, fetchImpl: async () => {
    count++;
    return new Response(JSON.stringify({ error: 'The orientation is already fully booked.' }), { status: 409 });
  } });
  await assert.rejects(api.createReservation({ orientation_id: 1 }), /fully booked/);
  assert.equal(count, 1);
});

test('confirmation strips private applicant data and requires reference plus phone', async () => {
  const row = { reference_number: 'BGA-TEST', full_name: 'Test Applicant', reservation_status: 'Pending', phone: '09170000001', email: 'private@example.com', address: 'Private address', notes: 'Private notes' };
  const confirmation = normalizeConfirmation(row);
  assert.equal(confirmation.status, 'Pending');
  for (const key of ['phone', 'email', 'address', 'notes']) assert.equal(key in confirmation, false);
  const missing = createApi({ supabase: mockClient({ data: [], error: null }) });
  assert.equal(await missing.lookupReservationConfirmation('wrong-ref', 'wrong-phone'), null);
});

test('ordinary Supabase account is signed out and cannot fall back to Express login', async () => {
  let signedOut = 0;
  let fetched = 0;
  const supabase = mockClient({ data: null, error: null });
  supabase.auth = {
    signInWithPassword: async () => ({ data: { session: { access_token: 'token' }, user: { id: 'customer', email: 'customer@example.com' } } }),
    signOut: async () => { signedOut++; }
  };
  const api = createApi({ supabase, development: true, fetchImpl: () => { fetched++; } });
  await assert.rejects(api.loginAdmin('customer@example.com', 'password'), /not authorized/);
  assert.equal(signedOut, 1);
  assert.equal(fetched, 0);
});

test('approved admin login declares the provider and supplies the session', async () => {
  const supabase = mockClient({ data: { user_id: 'admin' }, error: null });
  supabase.auth = { signInWithPassword: async () => ({ data: { session: { access_token: 'token' }, user: { id: 'admin', email: 'admin@example.com' } } }) };
  const session = await createApi({ supabase }).loginAdmin('admin@example.com', 'password');
  assert.equal(session.provider, 'supabase');
  assert.equal(session.admin.id, 'admin');
});
