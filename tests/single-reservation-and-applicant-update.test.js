import test from 'node:test';
import assert from 'node:assert/strict';
import { validateApplicant } from '../server/reservationDomain.js';

test('applicant validation normalizes email and trims all fields', () => {
  const applicant = {
    orientation_id: 1,
    full_name: '  Kezia Uriarte Mahinay  ',
    phone: '0906-046-7405',
    email: ' KeziaMahinay@Gmail.Com ',
    address: 'Butuan City',
    city: 'Butuan City',
    province: 'Agusan del Norte',
    notes: 'Typo corrected'
  };

  const validated = validateApplicant(applicant);
  assert.equal(validated.full_name, 'Kezia Uriarte Mahinay');
  assert.equal(validated.email, 'keziamahinay@gmail.com');
  assert.equal(validated.phone, '0906-046-7405');
  assert.equal(validated.address, 'Butuan City');
  assert.equal(validated.city, 'Butuan City');
  assert.equal(validated.province, 'Agusan del Norte');
  assert.equal(validated.notes, 'Typo corrected');
});

test('applicant validation rejects missing fields or invalid phones/emails', () => {
  const base = {
    orientation_id: 1,
    full_name: 'Kezia',
    phone: '09060467405',
    email: 'kezia@example.com',
    address: 'Valid address street',
    city: 'Butuan',
    province: 'Agusan'
  };

  assert.throws(() => validateApplicant({ ...base, full_name: '   ' }), { status: 400 });
  assert.throws(() => validateApplicant({ ...base, phone: '123' }), { status: 400 });
  assert.throws(() => validateApplicant({ ...base, email: 'not-an-email' }), { status: 400 });
  assert.throws(() => validateApplicant({ ...base, address: '' }), { status: 400 });
});
