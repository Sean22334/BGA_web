import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { bookMySql, changeMySqlReservationStatus, updateMySqlOrientation } from '../server/reservationDomain.js';
import { createDevelopmentData } from '../shared/developmentData.js';

// MYSQL_TEST_URL must identify a test service whose user may create temporary databases.
// The application's DB_* environment values are deliberately never used by this suite.
test('MySQL transaction integrity against a real database', { skip: !process.env.MYSQL_TEST_URL, timeout: 45000 }, async (t) => {
  const databaseName = `bga_test_${crypto.randomBytes(8).toString('hex')}`;
  const connection = await mysql.createConnection(process.env.MYSQL_TEST_URL);
  let pool;
  t.after(async () => {
    if (pool) await pool.end();
    // Generated identifier cannot name an application database.
    assert.match(databaseName, /^bga_test_[a-f0-9]{16}$/);
    await connection.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    await connection.end();
  });
  await connection.query(`CREATE DATABASE \`${databaseName}\``);
  const url = new URL(process.env.MYSQL_TEST_URL);
  url.pathname = `/${databaseName}`;
  pool = mysql.createPool({ uri: url.href, dateStrings: true, connectionLimit: 5 });
  await pool.query(`CREATE TABLE orientations (
    id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255), branch VARCHAR(50), venue VARCHAR(255), description TEXT,
    date DATE, start_time VARCHAR(20), end_time VARCHAR(20), capacity INT NOT NULL, reserved INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL
  ) ENGINE=InnoDB`);
  await pool.query(`CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY, orientation_id INT NOT NULL, reference_number VARCHAR(50) UNIQUE,
    full_name VARCHAR(150), phone VARCHAR(50), email VARCHAR(255), address TEXT, city VARCHAR(100), province VARCHAR(100), notes TEXT,
    status VARCHAR(30) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orientation_id) REFERENCES orientations(id) ON DELETE CASCADE, INDEX (orientation_id)
  ) ENGINE=InnoDB`);
  await pool.query(`INSERT INTO orientations (title, branch, venue, date, start_time, capacity, reserved, status)
    VALUES ('Upgrade future', 'Tagum', 'Test', DATE_ADD(UTC_DATE(), INTERVAL 7 DAY), '09:00 AM', 50, 1, 'Open'),
           ('Upgrade past', 'Tagum', 'Test', '2000-01-01', '09:00', 50, 1, 'Open')`);
  await pool.query(`INSERT INTO reservations (orientation_id, reference_number, full_name, phone, email, status)
    VALUES (1, 'UPGRADE-FUTURE', 'Test', '09170000901', 'upgrade1@example.com', 'Pending'),
           (1, 'UPGRADE-CANCELLED', 'Test', '09170000902', 'upgrade2@example.com', 'Cancelled'),
           (2, 'UPGRADE-PAST', 'Test', '09170000903', 'upgrade3@example.com', 'Pending')`);
  const upgrade = await readFile(new URL('../server/migrations/202610230002_auto_confirm_unlimited_capacity.sql', import.meta.url), 'utf8');
  for (const statement of upgrade.split(';').map((sql) => sql.trim()).filter(Boolean)) await pool.query(statement);
  const [upgraded] = await pool.query('SELECT reference_number, status FROM reservations');
  assert.deepEqual(Object.fromEntries(upgraded.map((row) => [row.reference_number, row.status])), {
    'UPGRADE-FUTURE': 'Confirmed', 'UPGRADE-CANCELLED': 'Cancelled', 'UPGRADE-PAST': 'Pending'
  });
  const [counts] = await pool.query('SELECT reserved FROM orientations ORDER BY id');
  assert.deepEqual(counts.map((row) => row.reserved), [1, 1]);
  const fixture = createDevelopmentData().orientations[0];
  const addEvent = async (capacity) => {
    const [result] = await pool.query('INSERT INTO orientations (title, branch, venue, description, date, start_time, end_time, capacity, reserved, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
      ['MySQL test event', 'Tagum', 'Demo venue', '', fixture.date, '09:00 AM', '12:00 PM', capacity, 'Open']);
    return result.insertId;
  };
  const applicant = (id, suffix) => ({ orientation_id: id, full_name: `MySQL Test ${suffix}`, phone: `0998000000${suffix}`, email: `mysql${suffix}@example.com`, address: 'Demo', city: 'Tagum', province: 'Davao', notes: '' });
  const getEvent = async (id) => (await pool.query('SELECT * FROM orientations WHERE id = ?', [id]))[0][0];

  await t.test('exactly one concurrent final-seat booking commits', async () => {
    const id = await addEvent(1);
    const results = await Promise.allSettled([bookMySql(pool, applicant(id, 1)), bookMySql(pool, applicant(id, 2))]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.find((result) => result.status === 'rejected').reason.status, 409);
    const event = await getEvent(id);
    assert.equal(event.reserved, 1);
    assert.equal(event.status, 'Fully Booked');
    assert.equal((await pool.query('SELECT COUNT(*) AS count FROM reservations WHERE orientation_id = ?', [id]))[0][0].count, 1);
  });

  await t.test('reactivation computes the count once and cannot exceed capacity', async () => {
    const id = await addEvent(3);
    const first = await bookMySql(pool, applicant(id, 1));
    await bookMySql(pool, applicant(id, 2));
    await changeMySqlReservationStatus(pool, first.reservation_id, 'Cancelled');
    await changeMySqlReservationStatus(pool, first.reservation_id, 'Confirmed');
    assert.equal((await getEvent(id)).reserved, 2);
    assert.equal((await getEvent(id)).status, 'Open'); // Catches MySQL left-to-right double increment.
    await changeMySqlReservationStatus(pool, first.reservation_id, 'Cancelled');
    await bookMySql(pool, applicant(id, 3));
    await bookMySql(pool, applicant(id, 4));
    await assert.rejects(changeMySqlReservationStatus(pool, first.reservation_id, 'Confirmed'), { status: 409 });
    assert.equal((await getEvent(id)).reserved, 3);
    assert.equal((await pool.query('SELECT status FROM reservations WHERE id = ?', [first.reservation_id]))[0][0].status, 'Cancelled');
  });

  await t.test('duplicate contact rejection includes reactivation and formatted phones', async () => {
    const id = await addEvent(5);
    const first = await bookMySql(pool, applicant(id, 1));
    await assert.rejects(bookMySql(pool, { ...applicant(id, 2), phone: '0998-000-0001' }), { status: 409 });
    await assert.rejects(bookMySql(pool, { ...applicant(id, 2), email: ' MYSQL1@EXAMPLE.COM ' }), { status: 409 });
    await changeMySqlReservationStatus(pool, first.reservation_id, 'Cancelled');
    await bookMySql(pool, applicant(id, 1));
    await assert.rejects(changeMySqlReservationStatus(pool, first.reservation_id, 'Confirmed'), { status: 409 });
    assert.equal((await getEvent(id)).reserved, 1);
  });

  await t.test('booking racing a cancellation or reactivation preserves counts and completes without deadlock', async () => {
    const id = await addEvent(1);
    const first = await bookMySql(pool, applicant(id, 1));
    await changeMySqlReservationStatus(pool, first.reservation_id, 'Cancelled');
    const results = await Promise.allSettled([
      bookMySql(pool, applicant(id, 2)),
      changeMySqlReservationStatus(pool, first.reservation_id, 'Confirmed')
    ]);
    assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1);
    assert.equal(results.find((item) => item.status === 'rejected').reason.status, 409);
    const [counts] = await pool.query("SELECT COUNT(*) AS count FROM reservations WHERE orientation_id = ? AND status <> 'Cancelled'", [id]);
    assert.equal((await getEvent(id)).reserved, counts[0].count);
    assert.equal(counts[0].count, 1);
  });

  await t.test('capacity edit refuses fewer seats than active bookings', async () => {
    const id = await addEvent(3);
    await bookMySql(pool, applicant(id, 1));
    await bookMySql(pool, applicant(id, 2));
    await assert.rejects(updateMySqlOrientation(pool, id, { capacity: 1 }), { status: 409 });
    assert.equal((await getEvent(id)).capacity, 3);
  });

  await t.test('unlimited MySQL bookings confirm immediately and preserve counts on reactivation', async () => {
    const id = await addEvent(1);
    await updateMySqlOrientation(pool, id, { capacity: null });
    const first = await bookMySql(pool, applicant(id, 1));
    const second = await bookMySql(pool, applicant(id, 2));
    assert.equal(first.status, 'Confirmed');
    assert.equal(second.status, 'Confirmed');
    assert.equal((await getEvent(id)).reserved, 2);
    assert.equal((await getEvent(id)).capacity, null);
    assert.equal((await getEvent(id)).status, 'Open');
    await changeMySqlReservationStatus(pool, first.reservation_id, 'Cancelled');
    await changeMySqlReservationStatus(pool, first.reservation_id, 'Confirmed');
    assert.equal((await getEvent(id)).reserved, 2);
    await assert.rejects(updateMySqlOrientation(pool, id, { capacity: 1 }), { status: 409 });
    await updateMySqlOrientation(pool, id, { capacity: 2 });
    assert.equal((await getEvent(id)).status, 'Fully Booked');
    await updateMySqlOrientation(pool, id, { capacity: null });
    assert.equal((await getEvent(id)).status, 'Open');
  });
});
