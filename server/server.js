import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set. Copy .env.example to .env and configure your environment.');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const DEV_ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const DEV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

app.use(cors());
app.use(express.json());

// MySQL Pool setup
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bga_admissions_db',
  waitForConnections: true,
  connectionLimit: 10
};

let pool = null;
let isDbConnected = false;

// Local In-Memory Fallback Store if MySQL is offline
let mockAdmins =
  DEV_ADMIN_EMAIL && DEV_ADMIN_PASSWORD
    ? [{ id: 1, email: DEV_ADMIN_EMAIL, password: DEV_ADMIN_PASSWORD, name: 'BGA Admissions Officer' }]
    : [];

let mockOrientations = [
  {
    id: 1,
    title: 'FREE Saturday Cruise Career Orientation',
    branch: 'Tagum',
    venue: 'Bluechef Main Training Center, Tagum City',
    description: 'Comprehensive orientation covering cruise ship career pathways, STCW requirements, and POEA agency placement.',
    date: '2026-08-01',
    start_time: '09:00 AM',
    end_time: '12:00 PM',
    capacity: 60,
    reserved: 42,
    status: 'Open'
  },
  {
    id: 2,
    title: 'FREE Saturday Cruise Career Orientation',
    branch: 'Butuan',
    venue: 'BGA Butuan Culinary Lab, JC Aquino Ave',
    description: 'Learn how to start a high-paying career on international cruise ships with TESDA & USPH accredited training.',
    date: '2026-08-01',
    start_time: '01:30 PM',
    end_time: '04:30 PM',
    capacity: 50,
    reserved: 48,
    status: 'Open'
  },
  {
    id: 3,
    title: 'FREE Saturday Cruise Career Orientation',
    branch: 'Pagadian',
    venue: 'BGA Pagadian Training Hall, Rizal Ave',
    description: 'Exclusive guidance session for aspiring seafarers, F&B stewards, and shipboard chefs.',
    date: '2026-08-08',
    start_time: '09:00 AM',
    end_time: '12:00 PM',
    capacity: 40,
    reserved: 40,
    status: 'Fully Booked'
  },
  {
    id: 4,
    title: 'FREE Saturday Cruise Career Orientation',
    branch: 'Bacolod',
    venue: 'BGA Bacolod Campus, Lacson St.',
    description: 'Free orientation session on cruise ship culinary and hospitality certifications.',
    date: '2026-08-08',
    start_time: '01:30 PM',
    end_time: '04:30 PM',
    capacity: 45,
    reserved: 12,
    status: 'Open'
  }
];

let mockReservations = [
  {
    id: 1,
    orientation_id: 1,
    reference_number: 'BGA-2026-8492',
    full_name: 'Alex Rivera',
    phone: '09170000001',
    email: 'alex.rivera@example.com',
    address: '123 Sample Street',
    city: 'Tagum City',
    province: 'Davao del Norte',
    notes: 'Interested in Culinary Arts course',
    status: 'Confirmed',
    created_at: '2026-07-27 10:00:00'
  },
  {
    id: 2,
    orientation_id: 1,
    reference_number: 'BGA-2026-7310',
    full_name: 'Jane Doe',
    phone: '09170000002',
    email: 'jane.doe@example.com',
    address: '456 Demo Avenue',
    city: 'Panabo City',
    province: 'Davao del Norte',
    notes: 'Wants morning session evaluation',
    status: 'Pending',
    created_at: '2026-07-27 10:30:00'
  },
  {
    id: 3,
    orientation_id: 2,
    reference_number: 'BGA-2026-4198',
    full_name: 'John Smith',
    phone: '09170000003',
    email: 'john.smith@example.com',
    address: '789 Test Boulevard',
    city: 'Butuan City',
    province: 'Agusan del Norte',
    notes: 'Prior F&B experience in local resort',
    status: 'Confirmed',
    created_at: '2026-07-27 11:00:00'
  }
];

async function initDb() {
  try {
    pool = mysql.createPool(dbConfig);
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    isDbConnected = true;
    console.log('✅ Connected to MySQL database [bga_admissions_db]');
  } catch (err) {
    isDbConnected = false;
    console.log('⚠️ MySQL connection not available. Running in Standalone Store Mode.');
  }
}
initDb();

// Authentication Middleware
function verifyAdminToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Admin token missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

// -----------------------------------------------------------------------------
// 1. AUTHENTICATION ENDPOINTS
// -----------------------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (isDbConnected) {
    try {
      const [rows] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      const admin = rows[0];
      // Note: In production, compare with bcrypt.hash
      const token = jwt.sign({ id: admin.id, email: admin.email, name: admin.name }, JWT_SECRET, { expiresIn: '12h' });
      return res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database authentication error.' });
    }
  } else {
    const admin = mockAdmins.find((a) => a.email === email && a.password === password);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign({ id: admin.id, email: admin.email, name: admin.name }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  }
});

// -----------------------------------------------------------------------------
// 2. ORIENTATION ENDPOINTS
// -----------------------------------------------------------------------------

// Get All Orientations (Public & Admin list with filters)
app.get('/api/orientations', async (req, res) => {
  const { branch, status, search } = req.query;

  if (isDbConnected) {
    try {
      let query = 'SELECT *, (capacity - reserved) AS remaining_slots FROM orientations WHERE 1=1';
      const params = [];

      if (branch) {
        query += ' AND branch = ?';
        params.push(branch);
      }
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
      if (search) {
        query += ' AND (title LIKE ? OR venue LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      query += ' ORDER BY date ASC, start_time ASC';

      const [rows] = await pool.query(query, params);
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch orientations.' });
    }
  } else {
    let result = mockOrientations.map((o) => ({
      ...o,
      remaining_slots: Math.max(0, o.capacity - o.reserved)
    }));

    if (branch) {
      result = result.filter((o) => o.branch.toLowerCase() === branch.toLowerCase());
    }
    if (status) {
      result = result.filter((o) => o.status.toLowerCase() === status.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((o) => o.title.toLowerCase().includes(q) || o.venue.toLowerCase().includes(q));
    }
    return res.json(result);
  }
});

// Create Orientation Event (Admin Only)
app.post('/api/orientations', verifyAdminToken, async (req, res) => {
  const { title, branch, venue, description, date, start_time, end_time, capacity, status } = req.body;

  if (!title || !branch || !venue || !date || !capacity) {
    return res.status(400).json({ error: 'Title, branch, venue, date, and capacity are required.' });
  }

  const initialStatus = status || 'Published';

  if (isDbConnected) {
    try {
      const [result] = await pool.query(
        'INSERT INTO orientations (title, branch, venue, description, date, start_time, end_time, capacity, reserved, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
        [title, branch, venue, description || '', date, start_time || '09:00 AM', end_time || '12:00 PM', capacity, initialStatus]
      );
      return res.status(201).json({ message: 'Orientation created successfully', id: result.insertId });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error creating orientation.' });
    }
  } else {
    const newId = mockOrientations.length > 0 ? Math.max(...mockOrientations.map((o) => o.id)) + 1 : 1;
    const newOrientation = {
      id: newId,
      title,
      branch,
      venue,
      description: description || '',
      date,
      start_time: start_time || '09:00 AM',
      end_time: end_time || '12:00 PM',
      capacity: parseInt(capacity),
      reserved: 0,
      status: initialStatus
    };
    mockOrientations.push(newOrientation);
    return res.status(201).json({ message: 'Orientation created successfully', id: newId, orientation: newOrientation });
  }
});

// Update Orientation Event (Admin Only)
app.put('/api/orientations/:id', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { title, branch, venue, description, date, start_time, end_time, capacity, status } = req.body;

  if (isDbConnected) {
    try {
      await pool.query(
        'UPDATE orientations SET title=?, branch=?, venue=?, description=?, date=?, start_time=?, end_time=?, capacity=?, status=? WHERE id=?',
        [title, branch, venue, description, date, start_time, end_time, capacity, status, id]
      );
      return res.json({ message: 'Orientation updated successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update orientation.' });
    }
  } else {
    const idx = mockOrientations.findIndex((o) => o.id === parseInt(id));
    if (idx === -1) return res.status(404).json({ error: 'Orientation not found.' });

    mockOrientations[idx] = {
      ...mockOrientations[idx],
      title: title !== undefined ? title : mockOrientations[idx].title,
      branch: branch !== undefined ? branch : mockOrientations[idx].branch,
      venue: venue !== undefined ? venue : mockOrientations[idx].venue,
      description: description !== undefined ? description : mockOrientations[idx].description,
      date: date !== undefined ? date : mockOrientations[idx].date,
      start_time: start_time !== undefined ? start_time : mockOrientations[idx].start_time,
      end_time: end_time !== undefined ? end_time : mockOrientations[idx].end_time,
      capacity: capacity !== undefined ? parseInt(capacity) : mockOrientations[idx].capacity,
      status: status !== undefined ? status : mockOrientations[idx].status
    };
    return res.json({ message: 'Orientation updated successfully', orientation: mockOrientations[idx] });
  }
});

// Update Status / Close Registration (Admin Only)
app.patch('/api/orientations/:id/status', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ error: 'Status is required.' });

  if (isDbConnected) {
    try {
      await pool.query('UPDATE orientations SET status = ? WHERE id = ?', [status, id]);
      return res.json({ message: `Orientation status changed to ${status}` });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error updating status.' });
    }
  } else {
    const orientation = mockOrientations.find((o) => o.id === parseInt(id));
    if (!orientation) return res.status(404).json({ error: 'Orientation not found.' });
    orientation.status = status;
    return res.json({ message: `Orientation status changed to ${status}`, orientation });
  }
});

// Duplicate Orientation (Admin Only)
app.post('/api/orientations/:id/duplicate', verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  if (isDbConnected) {
    try {
      const [rows] = await pool.query('SELECT * FROM orientations WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Orientation not found.' });
      const orig = rows[0];
      const [result] = await pool.query(
        'INSERT INTO orientations (title, branch, venue, description, date, start_time, end_time, capacity, reserved, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
        [`${orig.title} (Copy)`, orig.branch, orig.venue, orig.description, orig.date, orig.start_time, orig.end_time, orig.capacity, 'Draft']
      );
      return res.status(201).json({ message: 'Event duplicated successfully', id: result.insertId });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to duplicate event.' });
    }
  } else {
    const orig = mockOrientations.find((o) => o.id === parseInt(id));
    if (!orig) return res.status(404).json({ error: 'Orientation not found.' });
    const newId = mockOrientations.length > 0 ? Math.max(...mockOrientations.map((o) => o.id)) + 1 : 1;
    const duplicated = {
      ...orig,
      id: newId,
      title: `${orig.title} (Copy)`,
      reserved: 0,
      status: 'Draft'
    };
    mockOrientations.push(duplicated);
    return res.status(201).json({ message: 'Event duplicated successfully', id: newId, orientation: duplicated });
  }
});

// Delete Orientation (Admin Only)
app.delete('/api/orientations/:id', verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  if (isDbConnected) {
    try {
      await pool.query('DELETE FROM orientations WHERE id = ?', [id]);
      return res.json({ message: 'Orientation deleted successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete orientation.' });
    }
  } else {
    mockOrientations = mockOrientations.filter((o) => o.id !== parseInt(id));
    mockReservations = mockReservations.filter((r) => r.orientation_id !== parseInt(id));
    return res.json({ message: 'Orientation deleted successfully' });
  }
});

// -----------------------------------------------------------------------------
// 3. RESERVATION ENDPOINTS
// -----------------------------------------------------------------------------

// Submit Public Reservation (Automatic Slot Computation & Capacity Check)
app.post('/api/reservations', async (req, res) => {
  const { orientation_id, full_name, phone, email, address, city, province, notes } = req.body;

  if (!orientation_id || !full_name || !phone || !email || !address || !city || !province) {
    return res.status(400).json({ error: 'All required applicant fields must be provided.' });
  }

  // Generate Reference Number (BGA-2026-XXXX)
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  const refNumber = `BGA-2026-${randomCode}`;

  if (isDbConnected) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Check capacity
      const [rows] = await conn.query('SELECT * FROM orientations WHERE id = ? FOR UPDATE', [orientation_id]);
      if (rows.length === 0) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({ error: 'Selected orientation event not found.' });
      }

      const orientation = rows[0];
      const remaining = orientation.capacity - orientation.reserved;

      if (remaining <= 0 || orientation.status === 'Fully Booked' || orientation.status === 'Closed') {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: 'Sorry! This orientation session is FULLY BOOKED or closed.' });
      }

      // Check for duplicate reservation by email or phone for this orientation event
      const [existing] = await conn.query(
        'SELECT id FROM reservations WHERE (email = ? OR phone = ?) AND orientation_id = ? AND status != "Cancelled"',
        [email, phone, orientation_id]
      );

      if (existing.length > 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          error: 'You have already submitted a reservation for this orientation session using this email or phone number.'
        });
      }

      // Insert reservation
      const [resResult] = await conn.query(
        'INSERT INTO reservations (orientation_id, reference_number, full_name, phone, email, address, city, province, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [orientation_id, refNumber, full_name, phone, email, address, city, province, notes || '', 'Pending']
      );

      // Increment reserved count & auto-update status if full
      const newReserved = orientation.reserved + 1;
      const newStatus = newReserved >= orientation.capacity ? 'Fully Booked' : orientation.status;

      await conn.query('UPDATE orientations SET reserved = ?, status = ? WHERE id = ?', [newReserved, newStatus, orientation_id]);

      await conn.commit();
      conn.release();

      return res.status(201).json({
        message: 'Reservation submitted successfully',
        reference_number: refNumber,
        reservation_id: resResult.insertId,
        orientation: {
          id: orientation.id,
          title: orientation.title,
          branch: orientation.branch,
          venue: orientation.venue,
          date: orientation.date,
          start_time: orientation.start_time
        }
      });
    } catch (err) {
      await conn.rollback();
      conn.release();
      console.error(err);
      return res.status(500).json({ error: 'Database transaction failed.' });
    }
  } else {
    const orientation = mockOrientations.find((o) => o.id === parseInt(orientation_id));
    if (!orientation) {
      return res.status(404).json({ error: 'Selected orientation event not found.' });
    }

    const remaining = orientation.capacity - orientation.reserved;
    if (remaining <= 0 || orientation.status === 'Fully Booked' || orientation.status === 'Closed') {
      return res.status(400).json({ error: 'Sorry! This orientation session is FULLY BOOKED or closed.' });
    }

    // Duplicate check for fallback store
    const existingDuplicate = mockReservations.find(
      (r) =>
        (r.email.toLowerCase() === email.toLowerCase() || r.phone === phone) &&
        r.orientation_id === parseInt(orientation_id) &&
        r.status !== 'Cancelled'
    );

    if (existingDuplicate) {
      return res.status(400).json({
        error: 'You have already submitted a reservation for this orientation session using this email or phone number.'
      });
    }

    // Process reservation
    orientation.reserved += 1;
    if (orientation.reserved >= orientation.capacity) {
      orientation.status = 'Fully Booked';
    }

    const newResId = mockReservations.length > 0 ? Math.max(...mockReservations.map((r) => r.id)) + 1 : 1;
    const newRes = {
      id: newResId,
      orientation_id: parseInt(orientation_id),
      reference_number: refNumber,
      full_name,
      phone,
      email,
      address,
      city,
      province,
      notes: notes || '',
      status: 'Pending',
      created_at: new Date().toISOString()
    };
    mockReservations.unshift(newRes);

    return res.status(201).json({
      message: 'Reservation submitted successfully',
      reference_number: refNumber,
      reservation_id: newResId,
      orientation: {
        id: orientation.id,
        title: orientation.title,
        branch: orientation.branch,
        venue: orientation.venue,
        date: orientation.date,
        start_time: orientation.start_time
      }
    });
  }
});

// Get All Reservations (Admin Filter & Search)
app.get('/api/reservations', verifyAdminToken, async (req, res) => {
  const { orientation_id, branch, status, search } = req.query;

  if (isDbConnected) {
    try {
      let query = `
        SELECT r.*, o.title AS orientation_title, o.branch AS orientation_branch, o.venue AS orientation_venue, o.date AS orientation_date, o.start_time AS orientation_time
        FROM reservations r
        JOIN orientations o ON r.orientation_id = o.id
        WHERE 1=1
      `;
      const params = [];

      if (orientation_id) {
        query += ' AND r.orientation_id = ?';
        params.push(orientation_id);
      }
      if (branch) {
        query += ' AND o.branch = ?';
        params.push(branch);
      }
      if (status) {
        query += ' AND r.status = ?';
        params.push(status);
      }
      if (search) {
        query += ' AND (r.full_name LIKE ? OR r.reference_number LIKE ? OR r.phone LIKE ? OR r.email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }
      query += ' ORDER BY r.created_at DESC';

      const [rows] = await pool.query(query, params);
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch reservations.' });
    }
  } else {
    let result = mockReservations.map((r) => {
      const o = mockOrientations.find((orig) => orig.id === r.orientation_id) || {};
      return {
        ...r,
        orientation_title: o.title || 'Career Orientation',
        orientation_branch: o.branch || 'Tagum',
        orientation_venue: o.venue || 'BGA Training Center',
        orientation_date: o.date || '2026-08-01',
        orientation_time: o.start_time || '09:00 AM'
      };
    });

    if (orientation_id) {
      result = result.filter((r) => r.orientation_id === parseInt(orientation_id));
    }
    if (branch) {
      result = result.filter((r) => r.orientation_branch.toLowerCase() === branch.toLowerCase());
    }
    if (status) {
      result = result.filter((r) => r.status.toLowerCase() === status.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          r.reference_number.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          r.email.toLowerCase().includes(q)
      );
    }
    return res.json(result);
  }
});

// Update Reservation Status (Confirm / Cancel)
app.patch('/api/reservations/:id/status', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Valid status (Pending, Confirmed, Cancelled) is required.' });
  }

  if (isDbConnected) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rRows] = await conn.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [id]);
      if (rRows.length === 0) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({ error: 'Reservation not found.' });
      }

      const prevRes = rRows[0];
      const prevStatus = prevRes.status;

      await conn.query('UPDATE reservations SET status = ? WHERE id = ?', [status, id]);

      // Handle capacity adjustment if cancelled
      if (prevStatus !== 'Cancelled' && status === 'Cancelled') {
        await conn.query('UPDATE orientations SET reserved = GREATEST(0, reserved - 1), status = IF(status = "Fully Booked", "Open", status) WHERE id = ?', [prevRes.orientation_id]);
      } else if (prevStatus === 'Cancelled' && status !== 'Cancelled') {
        await conn.query('UPDATE orientations SET reserved = reserved + 1 WHERE id = ?', [prevRes.orientation_id]);
      }

      await conn.commit();
      conn.release();
      return res.json({ message: `Reservation status updated to ${status}` });
    } catch (err) {
      await conn.rollback();
      conn.release();
      console.error(err);
      return res.status(500).json({ error: 'Failed to update reservation status.' });
    }
  } else {
    const reservation = mockReservations.find((r) => r.id === parseInt(id));
    if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });

    const prevStatus = reservation.status;
    reservation.status = status;

    const orientation = mockOrientations.find((o) => o.id === reservation.orientation_id);
    if (orientation) {
      if (prevStatus !== 'Cancelled' && status === 'Cancelled') {
        orientation.reserved = Math.max(0, orientation.reserved - 1);
        if (orientation.status === 'Fully Booked') orientation.status = 'Open';
      } else if (prevStatus === 'Cancelled' && status !== 'Cancelled') {
        orientation.reserved += 1;
        if (orientation.reserved >= orientation.capacity) orientation.status = 'Fully Booked';
      }
    }

    return res.json({ message: `Reservation status updated to ${status}`, reservation });
  }
});

// Start Express Listener
app.listen(PORT, () => {
  console.log(`🚀 Bluechef Global Academy Express REST Server running on port ${PORT}`);
});
