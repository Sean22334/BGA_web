import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { isBookableOrientation, normalizePhone, orientationStartsAt } from '../shared/reservationRules.js';

export class ReservationError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function passwordMatches(password, hash) {
  if (typeof password !== 'string' || typeof hash !== 'string' || !/^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$/.test(hash)) return false;
  return bcrypt.compare(password, hash);
}

export function newReference() {
  return `BGA-${new Date().getFullYear()}-${crypto.randomBytes(10).toString('hex').toUpperCase()}`;
}

export function validateApplicant(body) {
  const limits = { full_name: 150, phone: 50, email: 255, address: 1000, city: 100, province: 100 };
  if (!Number.isSafeInteger(Number(body.orientation_id)) || Number(body.orientation_id) < 1) {
    throw new ReservationError(400, 'A valid orientation is required.');
  }
  for (const [field, limit] of Object.entries(limits)) {
    if (typeof body[field] !== 'string' || !body[field].trim() || body[field].trim().length > limit) {
      throw new ReservationError(400, 'All required applicant fields must be valid.');
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) || !/^\d{10,15}$/.test(normalizePhone(body.phone))) {
    throw new ReservationError(400, 'A valid email address and phone number are required.');
  }
  if (body.notes != null && (typeof body.notes !== 'string' || body.notes.length > 2000)) {
    throw new ReservationError(400, 'Notes must be at most 2000 characters.');
  }
  return {
    orientation_id: Number(body.orientation_id),
    ...Object.fromEntries(Object.keys(limits).map((field) => [field, body[field].trim()])),
    email: body.email.trim().toLowerCase(), notes: body.notes?.trim() || ''
  };
}

export function seatChange(orientation, previousStatus, nextStatus) {
  const reserved = Number(orientation.reserved);
  const capacity = Number(orientation.capacity);
  if (previousStatus !== 'Cancelled' && nextStatus === 'Cancelled') {
    return { reserved: Math.max(0, reserved - 1), status: orientation.status === 'Fully Booked' ? 'Open' : orientation.status };
  }
  if (previousStatus === 'Cancelled' && nextStatus !== 'Cancelled') {
    if (orientation.capacity !== null && reserved >= capacity) throw new ReservationError(409, 'The orientation is already fully booked.');
    return { reserved: reserved + 1, status: orientation.capacity !== null && reserved + 1 >= capacity ? 'Fully Booked' : orientation.status };
  }
  return { reserved, status: orientation.status };
}

export const ORIENTATION_STATUSES = ['Draft', 'Published', 'Open', 'Closed', 'Fully Booked'];

export function validateOrientation(input, previous = { reserved: 0 }) {
  const rawCapacity = input.capacity === undefined ? previous.capacity : input.capacity;
  const orientation = { ...previous, ...input, capacity: rawCapacity === null ? null : Number(rawCapacity) };
  if (['title', 'branch', 'venue'].some((field) => typeof orientation[field] !== 'string' || !orientation[field].trim() || orientation[field].length > 255)
    || !['Tagum', 'Butuan', 'Pagadian', 'Bacolod'].includes(orientation.branch)
    || (orientation.capacity !== null && (!Number.isSafeInteger(orientation.capacity) || orientation.capacity < 1 || orientation.capacity > 1000000))
    || !ORIENTATION_STATUSES.includes(orientation.status)
    || !Number.isFinite(orientationStartsAt(orientation))) {
    throw new ReservationError(400, 'Valid title, branch, venue, date, start time, capacity, and status are required.');
  }
  if (orientation.capacity !== null && orientation.capacity < Number(previous.reserved)) throw new ReservationError(409, 'Capacity cannot be lower than the number of active reservations.');
  // Counts belong to reservation operations, never to request fields.
  orientation.reserved = Number(previous.reserved);
  if (orientation.capacity === null && orientation.status === 'Fully Booked') orientation.status = 'Open';
  if (orientation.capacity !== null && ['Open', 'Published'].includes(orientation.status) && orientation.reserved >= orientation.capacity) orientation.status = 'Fully Booked';
  return orientation;
}

async function transaction(pool, operation) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function rejectDuplicate(connection, applicant, excludedId = 0) {
  const [duplicates] = await connection.query(
    `SELECT id, reference_number FROM reservations WHERE id <> ? AND status <> 'Cancelled'
      AND (LOWER(TRIM(email)) = ? OR REGEXP_REPLACE(phone, '[^0-9]', '') = ?) LIMIT 1 FOR UPDATE`,
    [excludedId, applicant.email.trim().toLowerCase(), normalizePhone(applicant.phone)]
  );
  if (duplicates.length) {
    throw new ReservationError(
      409,
      'You already have an active reservation under this email or phone number. Each applicant is allowed one active reservation to prevent duplicate bookings.'
    );
  }
}

export async function bookMySql(pool, applicant) {
  return transaction(pool, async (connection) => {
    const [orientations] = await connection.query('SELECT * FROM orientations WHERE id = ? FOR UPDATE', [applicant.orientation_id]);
    const orientation = orientations[0];
    if (!orientation) throw new ReservationError(404, 'Selected orientation event not found.');
    if (!isBookableOrientation(orientation)) throw new ReservationError(409, 'Selected orientation event is no longer available.');
    await rejectDuplicate(connection, applicant);
    const reference = newReference();
    const [inserted] = await connection.query(
      'INSERT INTO reservations (orientation_id, reference_number, full_name, phone, email, address, city, province, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [applicant.orientation_id, reference, applicant.full_name, applicant.phone, applicant.email, applicant.address, applicant.city, applicant.province, applicant.notes, 'Confirmed']
    );
    const count = Number(orientation.reserved) + 1;
    await connection.query('UPDATE orientations SET reserved = ?, status = ? WHERE id = ?', [count, orientation.capacity !== null && count >= Number(orientation.capacity) ? 'Fully Booked' : orientation.status, orientation.id]);
    return { message: 'Reservation confirmed successfully', status: 'Confirmed', reference_number: reference, reservation_id: inserted.insertId, orientation };
  });
}

export async function changeMySqlReservationStatus(pool, id, status) {
  return transaction(pool, async (connection) => {
    // Discover parent without locking the child. All writers lock parent first.
    const [parents] = await connection.query('SELECT orientation_id FROM reservations WHERE id = ?', [id]);
    if (!parents.length) throw new ReservationError(404, 'Reservation not found.');
    const [orientations] = await connection.query('SELECT * FROM orientations WHERE id = ? FOR UPDATE', [parents[0].orientation_id]);
    if (!orientations.length) throw new ReservationError(404, 'Orientation not found.');
    const [reservations] = await connection.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [id]);
    const reservation = reservations[0];
    if (!reservation) throw new ReservationError(404, 'Reservation not found.');
    if (reservation.status === 'Cancelled' && status !== 'Cancelled') await rejectDuplicate(connection, reservation, id);
    const next = seatChange(orientations[0], reservation.status, status);
    await connection.query('UPDATE orientations SET reserved = ?, status = ? WHERE id = ?', [next.reserved, next.status, reservation.orientation_id]);
    await connection.query('UPDATE reservations SET status = ? WHERE id = ?', [status, id]);
    return { message: `Reservation status updated to ${status}` };
  });
}

export async function updateMySqlOrientation(pool, id, input) {
  return transaction(pool, async (connection) => {
    const [rows] = await connection.query('SELECT * FROM orientations WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) throw new ReservationError(404, 'Orientation not found.');
    const orientation = validateOrientation(input, rows[0]);
    await connection.query('UPDATE orientations SET title=?, branch=?, venue=?, description=?, date=?, start_time=?, end_time=?, capacity=?, status=? WHERE id=?',
      [orientation.title, orientation.branch, orientation.venue, orientation.description || '', orientation.date, orientation.start_time, orientation.end_time || '', orientation.capacity, orientation.status, id]);
    return { message: 'Orientation updated successfully', orientation };
  });
}

export async function updateApplicantReservationMySql(pool, data) {
  return transaction(pool, async (connection) => {
    const [reservations] = await connection.query(
      `SELECT r.*, o.title AS orientation_title, o.branch AS orientation_branch, o.venue AS orientation_venue,
              o.date AS orientation_date, o.start_time AS orientation_start_time, o.end_time AS orientation_end_time
       FROM reservations r
       JOIN orientations o ON o.id = r.orientation_id
       WHERE UPPER(r.reference_number) = UPPER(?)
         AND REGEXP_REPLACE(r.phone, '[^0-9]', '') = ?
       LIMIT 1 FOR UPDATE`,
      [data.reference_number.trim(), normalizePhone(data.phone)]
    );
    if (!reservations.length) throw new ReservationError(404, 'Reservation not found or phone number does not match.');
    const reservation = reservations[0];
    if (reservation.status === 'Cancelled') throw new ReservationError(400, 'Cancelled reservations cannot be edited.');

    const newPhone = data.new_phone || data.phone;
    const applicant = {
      orientation_id: reservation.orientation_id,
      full_name: data.full_name,
      phone: newPhone,
      email: data.email,
      address: data.address,
      city: data.city,
      province: data.province,
      notes: data.notes
    };
    const validated = validateApplicant(applicant);

    // Check duplicate against other active reservations
    await rejectDuplicate(connection, validated, reservation.id);

    await connection.query(
      `UPDATE reservations
       SET full_name = ?, phone = ?, email = ?, address = ?, city = ?, province = ?, notes = ?
       WHERE id = ?`,
      [validated.full_name, validated.phone, validated.email, validated.address, validated.city, validated.province, validated.notes, reservation.id]
    );

    return {
      reference_number: reservation.reference_number,
      full_name: validated.full_name,
      phone: validated.phone,
      email: validated.email,
      address: validated.address,
      city: validated.city,
      province: validated.province,
      notes: validated.notes,
      reservation_status: reservation.status,
      orientation_title: reservation.orientation_title,
      orientation_branch: reservation.orientation_branch,
      orientation_venue: reservation.orientation_venue,
      orientation_date: reservation.orientation_date,
      orientation_start_time: reservation.orientation_start_time,
      orientation_end_time: reservation.orientation_end_time,
      submitted_at: reservation.created_at
    };
  });
}
