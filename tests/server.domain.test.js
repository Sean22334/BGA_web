import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { createDevelopmentData } from '../shared/developmentData.js';
import { isBookableOrientation, orientationStartsAt, todayInManila } from '../shared/reservationRules.js';
import { newReference, passwordMatches, seatChange, validateApplicant, validateOrientation } from '../server/reservationDomain.js';

test('MySQL password verification rejects wrong passwords and malformed or missing hashes', async () => {
  const hash = await bcrypt.hash('Only the correct password', 4);
  assert.equal(await passwordMatches('Only the correct password', hash), true);
  assert.equal(await passwordMatches('any-password-bypass', hash), false);
  assert.equal(await passwordMatches('password', 'plaintext-password'), false);
  assert.equal(await passwordMatches('password', null), false);
});

test('bookability uses Philippine start time and rejects past, full, draft and closed events', () => {
  const now = new Date('2026-09-14T02:00:00Z'); // 10 AM Manila
  const orientation = { date: '2026-09-14', start_time: '11:00 AM', status: 'Open', capacity: 2, reserved: 1 };
  assert.equal(isBookableOrientation(orientation, now), true);
  assert.equal(isBookableOrientation({ ...orientation, start_time: '09:59 AM' }, now), false);
  assert.equal(isBookableOrientation({ ...orientation, start_time: '10:00 AM' }, now), false);
  for (const status of ['Draft', 'Closed', 'Fully Booked']) assert.equal(isBookableOrientation({ ...orientation, status }, now), false);
  assert.equal(isBookableOrientation({ ...orientation, reserved: 2 }, now), false);
  assert.equal(isBookableOrientation({ ...orientation, date: '2026-09-13' }, now), false);
  assert.equal(isBookableOrientation({ ...orientation, start_time: 'invalid' }, now), false);
  assert.equal(isBookableOrientation({ ...orientation, date: '2027-02-31' }, now), false);
  assert.equal(orientationStartsAt({ date: '2026-09-14', start_time: '12:00 AM' }), Date.parse('2026-09-13T16:00:00Z'));
  assert.equal(orientationStartsAt({ date: '2026-09-14', start_time: '12:00 PM' }), Date.parse('2026-09-14T04:00:00Z'));
  assert.equal(todayInManila(new Date('2026-09-14T17:00:00Z')), '2026-09-15');
});

test('future demo schedules keep coherent counts and every open event remains bookable', () => {
  for (const now of [new Date('2026-09-14T00:00:00Z'), new Date('2031-12-31T23:00:00Z')]) {
    const { orientations, reservations } = createDevelopmentData(now);
    for (const orientation of orientations) {
      assert.equal(orientation.reserved, reservations.filter((r) => r.orientation_id === orientation.id && r.status !== 'Cancelled').length);
      assert.ok(orientation.date > todayInManila(now));
      assert.equal(isBookableOrientation(orientation, now), orientation.status !== 'Fully Booked');
    }
  }
});

test('reactivation marks full only on the actual final seat and refuses overselling', () => {
  assert.deepEqual(seatChange({ capacity: 3, reserved: 1, status: 'Open' }, 'Cancelled', 'Pending'), { reserved: 2, status: 'Open' });
  assert.deepEqual(seatChange({ capacity: 3, reserved: 2, status: 'Open' }, 'Cancelled', 'Confirmed'), { reserved: 3, status: 'Fully Booked' });
  assert.throws(() => seatChange({ capacity: 3, reserved: 3, status: 'Fully Booked' }, 'Cancelled', 'Pending'), { status: 409 });
});

test('cancellation releases a seat once and active-to-active changes preserve counts', () => {
  assert.deepEqual(seatChange({ capacity: 3, reserved: 3, status: 'Fully Booked' }, 'Pending', 'Cancelled'), { reserved: 2, status: 'Open' });
  assert.deepEqual(seatChange({ capacity: 3, reserved: 2, status: 'Open' }, 'Cancelled', 'Cancelled'), { reserved: 2, status: 'Open' });
  assert.deepEqual(seatChange({ capacity: 3, reserved: 2, status: 'Closed' }, 'Pending', 'Confirmed'), { reserved: 2, status: 'Closed' });
});

test('applicant validation rejects malformed input before persistence and normalizes email', () => {
  const applicant = { orientation_id: 1, full_name: ' Demo Person ', phone: '0917-000-0001', email: ' Demo@Example.com ', address: 'Address', city: 'City', province: 'Province' };
  assert.equal(validateApplicant(applicant).email, 'demo@example.com');
  assert.equal(validateApplicant(applicant).full_name, 'Demo Person');
  for (const replacement of [{ orientation_id: 0 }, { full_name: ' ' }, { phone: {} }, { email: 'bad' }, { notes: 'x'.repeat(2001) }]) {
    assert.throws(() => validateApplicant({ ...applicant, ...replacement }), { status: 400 });
  }
});

test('orientation editing cannot lower capacity under active reservations or forge reserved counts', () => {
  const orientation = createDevelopmentData().orientations[0];
  assert.throws(() => validateOrientation({ capacity: 1 }, orientation), { status: 409 });
  assert.equal(validateOrientation({ reserved: 0 }, orientation).reserved, 2);
  assert.equal(validateOrientation({ capacity: 2 }, orientation).status, 'Fully Booked');
  assert.throws(() => validateOrientation({ status: 'anything' }, orientation), { status: 400 });
});

test('references contain 80 random bits and remain distinct across repeated submissions', () => {
  const values = Array.from({ length: 1000 }, () => newReference());
  assert.equal(new Set(values).size, values.length);
  assert.match(values[0], /^BGA-\d{4}-[A-F0-9]{20}$/);
});
