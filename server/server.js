import { registerCmsRoutes } from './cmsRoutes.js';
import { registerPublishingRoutes } from './publishingRoutes.js';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createDevelopmentData } from '../shared/developmentData.js';
import { isBookableOrientation, normalizePhone, remainingSlots, todayInManila } from '../shared/reservationRules.js';
import { bookMySql, changeMySqlReservationStatus, newReference, ORIENTATION_STATUSES, passwordMatches, ReservationError, seatChange, updateApplicantReservationMySql, updateMySqlOrientation, validateApplicant, validateOrientation } from './reservationDomain.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const USE_DEVELOPMENT_MEMORY = !IS_PRODUCTION && process.env.BGA_DEV_MEMORY === 'true';

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set. Copy .env.example to .env and configure your environment.');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const DEV_ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const DEV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Ensure public/uploads directory exists
const uploadsDir = process.env.NODE_ENV !== 'production' && process.env.BGA_UPLOAD_DIR
  ? path.resolve(process.env.BGA_UPLOAD_DIR) : path.join(__dirname, '../public/uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.log('⚠️ Uploads directory check notice:', e.message);
}

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, '../public')));

// MySQL Pool setup
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bga_admissions_db',
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10
};

let pool = null;
let isDbConnected = false;

// Local In-Memory Fallback Store if MySQL is offline
const mockAdmins =
  DEV_ADMIN_EMAIL && DEV_ADMIN_PASSWORD
    ? [{ id: 1, email: DEV_ADMIN_EMAIL, password: DEV_ADMIN_PASSWORD, name: 'BGA Admissions Officer' }]
    : [];

let { orientations: mockOrientations, reservations: mockReservations } = createDevelopmentData();

// CMS Standalone Mock Dataset
let mockSiteSettings = {
  hero_badge: 'TESDA Accredited • International Cruise Placement',
  hero_headline: 'Crafting World-Class Careers on',
  hero_headline_highlight: 'International Cruise Ships',
  hero_subheadline: 'TESDA-accredited culinary, hospitality, and maritime training programs designed to prepare aspiring seafarers for high-paying contracts on luxury ocean liners.',
  hero_primary_cta_text: 'Reserve Free Orientation',
  hero_secondary_cta_text: 'Explore Programs',
  hero_bg_image: '/images/BGA LOGOOO.png',
  about_badge: 'About Bluechef Global Academy',
  about_headline: 'Crafting World-Class Careers On',
  about_headline_highlight: 'The High Seas',
  about_subheadline: 'Bluechef Global Academy is the premier maritime hospitality and culinary training institute in the Philippines, transforming passionate individuals into high-earning global seafarers.',
  about_mission_title: 'Our Mission',
  about_mission_desc: 'To empower Filipino youth and hospitality professionals with top-tier, international-standard culinary and maritime training, unlocking lucrative global career opportunities and elevating the standard of Filipino seafarers worldwide.',
  about_vision_title: 'Our Vision',
  about_vision_desc: 'To be the most recognized and trusted cruise career training brand in Southeast Asia, preferred by global cruise liners for producing disciplined, highly skilled, and compassionate maritime professionals.',
  about_why_title: 'Why Choose Bluechef Global Academy?',
  about_why_items: JSON.stringify([
    { title: 'TESDA-Aligned Curriculum', desc: 'Programs designed strictly according to international maritime (STCW & MLC 2006) and USPH culinary standards.', icon: 'ShieldCheck' },
    { title: 'State-of-the-Art Labs', desc: 'Train in fully equipped commercial kitchens and mock cruise staterooms that mirror real shipboard environments.', icon: 'Building2' },
    { title: 'Direct Agency Placement', desc: 'Exclusive recruitment endorsements with top POEA/DMW licensed manning agencies for major luxury cruise lines.', icon: 'Anchor' },
    { title: 'Veteran Industry Faculty', desc: 'Learn directly from former cruise ship Executive Chefs, F&B Managers, and Chief Housekeepers.', icon: 'Sparkles' }
  ]),
  contact_hotline: '+63 956 483 9033 (Globe)',
  contact_email: 'bluechefglobalacademy@gmail.com',
  contact_facebook: 'https://www.facebook.com/bluechefglobalacademy',
  contact_hours: 'Monday - Saturday: 8:00 AM - 5:00 PM',
  contact_map_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1144.6745001914448!2d125.80265620350177!3d7.448243878904475!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32f9531262cc8317%3A0x16fdd36a831bf336!2sLacor%20Building%2C%20Bonifacio%20St%2C%20Tagum%2C%20Davao%20del%20Norte!5e1!3m2!1sen!2sph!4v1784871359698!5m2!1sen!2sph',
  footer_tagline: 'Premier Cruise Career Training Academy in the Philippines',
  footer_copyright: '© 2026 Bluechef Global Academy. All rights reserved.',
  announcement_text: 'New Saturday Career Orientation schedules are now open across all BGA regional branches!',
  announcement_active: 'true'
};

let mockStats = [
  { id: 1, stat_key: 'years', value: '12+', label: 'Years of Excellence', icon: 'Award', display_order: 1 },
  { id: 2, stat_key: 'graduates', value: '8,500+', label: 'Successful Graduates', icon: 'Users', display_order: 2 },
  { id: 3, stat_key: 'centers', value: '4', label: 'Training Centers', icon: 'MapPin', display_order: 3 }
];

let mockCmsPrograms = [
  {
    id: 1,
    program_id: 'culinary',
    title: 'Culinary Arts for Cruise Ships',
    category: 'Culinary',
    badge: 'Most Popular',
    short_description: 'Master international galley operations, fine dining preparation, HACCP food safety, and high-volume cruise kitchen management.',
    duration: '5 days training',
    eligibility: 'High School Grad / College Level (21-45 y/o)',
    image: '/images/culinary_lab.jpg',
    overview: 'Designed specifically for luxury international cruise line galley operations. Trainees undergo rigorous hands-on practice in commercial-grade kitchens learning continental cuisine, butchery, pastry, menu execution, and USPH standards.',
    highlights: JSON.stringify([
      'USPH & HACCP Food Safety Certification Prep',
      'High-Volume Buffet & Fine Dining Plating',
      'Galley Workflow & Kitchen Safety Protocol',
      'Direct Recruitment Endorsement to Partner Agencies'
    ]),
    display_order: 1,
    is_published: 1
  }
];

let mockCmsBranches = [
  {
    id: 1,
    branch_key: 'tagum',
    name: 'Tagum Main Branch',
    address: 'BGA Building, National Highway, Tagum City, Davao del Norte, Philippines',
    phone: '+63 917 123 4567 / (084) 216-9876',
    email: 'tagum@bluechefglobal.com',
    hours: 'Mon - Sat: 8:00 AM - 5:00 PM',
    map_url: 'https://maps.google.com/?q=Tagum+City+Davao+del+Norte',
    image: '/images/hero_cruise_ship.jpg',
    features: JSON.stringify(['Main Assessment Center', 'Full Commercial Kitchen Lab', 'Mock Cruise Suite']),
    display_order: 1,
    is_published: 1
  },
  {
    id: 2,
    branch_key: 'butuan',
    name: 'Butuan City Branch',
    address: 'J.C. Aquino Avenue, Brgy. Bayanihan, Butuan City, Agusan del Norte',
    phone: '+63 928 987 6543 / (085) 815-4321',
    email: 'butuan@bluechefglobal.com',
    hours: 'Mon - Sat: 8:00 AM - 5:00 PM',
    map_url: 'https://maps.google.com/?q=Butuan+City+Agusan+del+Norte',
    image: '/images/culinary_lab.jpg',
    features: JSON.stringify(['Hospitality Training Lab', 'Mixology Bar Studio', 'Interview Prep Suite']),
    display_order: 2,
    is_published: 1
  },
  {
    id: 3,
    branch_key: 'pagadian',
    name: 'Pagadian City Branch',
    address: 'Rizal Avenue, Tuburan, Pagadian City, Zamboanga del Sur',
    phone: '+63 939 456 7890 / (062) 925-1122',
    email: 'pagadian@bluechefglobal.com',
    hours: 'Mon - Sat: 8:00 AM - 5:00 PM',
    map_url: 'https://maps.google.com/?q=Pagadian+City+Zamboanga+del+Sur',
    image: '/images/fnb_service.jpg',
    features: JSON.stringify(['Culinary Workshop Suite', 'Multimedia Classroom', 'Orientation Hall']),
    display_order: 3,
    is_published: 1
  },
  {
    id: 4,
    branch_key: 'bacolod',
    name: 'Bacolod City Branch',
    address: 'Lacson Street, Mandalagan, Bacolod City, Negros Occidental',
    phone: '+63 919 654 3210 / (034) 433-8899',
    email: 'bacolod@bluechefglobal.com',
    hours: 'Mon - Sat: 8:00 AM - 5:00 PM',
    map_url: 'https://maps.google.com/?q=Bacolod+City+Negros+Occidental',
    image: '/images/graduation_ceremony.jpg',
    features: JSON.stringify(['Modern Culinary Kitchen', 'Dining Service Room', 'Career Guidance Center']),
    display_order: 4,
    is_published: 1
  }
];

let mockCmsGallery = [
  { id: 1, title: 'Hands-on Culinary Butchery Class', category: 'Training', image: '/images/culinary_lab.jpg', display_order: 1, is_published: 1 },
  { id: 2, title: 'Commercial Pastry & Baking Suite', category: 'Kitchen Lab', image: '/images/culinary_lab.jpg', display_order: 2, is_published: 1 },
  { id: 3, title: 'Free Weekly Career Orientation', category: 'Orientation', image: '/images/hero_cruise_ship.jpg', display_order: 3, is_published: 1 },
  { id: 4, title: 'Class 2025 Pinning & Graduation', category: 'Graduation', image: '/images/graduation_ceremony.jpg', display_order: 4, is_published: 1 },
  { id: 5, title: 'Flaming Cocktail Mixology Demo', category: 'Student Activities', image: '/images/fnb_service.jpg', display_order: 5, is_published: 1 },
  { id: 6, title: 'Fine Dining Silver Service Practice', category: 'Training', image: '/images/fnb_service.jpg', display_order: 6, is_published: 1 },
  { id: 7, title: 'USPH Kitchen Sanitation Audit', category: 'Kitchen Lab', image: '/images/culinary_lab.jpg', display_order: 7, is_published: 1 },
  { id: 8, title: 'Team Building & Maritime Drills', category: 'Student Activities', image: '/images/graduation_ceremony.jpg', display_order: 8, is_published: 1 }
];

let mockCmsTestimonials = [
  {
    id: 1,
    name: 'Chef Mark Anthony Santos',
    role: 'Commis de Cuisine',
    company: 'Royal Caribbean International',
    quote: 'Bluechef Global Academy gave me the exact hands-on galley experience needed to pass my cruise line practical trade test on the very first try! Now I travel the world while earning in USD.',
    avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=250&q=80',
    branch_tag: 'Tagum Branch Graduate',
    display_order: 1,
    is_published: 1
  },
  {
    id: 2,
    name: 'Jessica Mae Rodriguez',
    role: 'Assistant Stateroom Attendant',
    company: 'Celebrity Cruises',
    quote: 'The instructors at BGA are true cruise industry veterans. They taught us not just skills, but the discipline, confidence, and English communication required for international guests.',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
    branch_tag: 'Butuan Branch Graduate',
    display_order: 2,
    is_published: 1
  },
  {
    id: 3,
    name: 'Christian Dave Perez',
    role: 'Bar Waiter',
    company: 'Carnival Cruise Line',
    quote: 'Attending the FREE orientation at Pagadian branch changed my life. Within 5 months of training, I got hired by Carnival. Thank you Bluechef family!',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    branch_tag: 'Pagadian Branch Graduate',
    display_order: 3,
    is_published: 1
  },
  {
    id: 4,
    name: 'Elena Rose Flores',
    role: 'Buffet Attendant',
    company: 'MSC Cruises',
    quote: 'From zero knowledge to working on a luxury liner in Europe! BGA Bacolod branch guided me step-by-step from training to agency interviews.',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
    branch_tag: 'Bacolod Branch Graduate',
    display_order: 4,
    is_published: 1
  }
];

let mockCmsFaqs = [
  {
    id: 1,
    faq_key: 'faq-1',
    question: 'What are the basic admission requirements to enroll in BGA?',
    answer: 'Basic requirements include: High School Diploma or ALS Certificate, PSA Birth Certificate, Barangay Clearance, 2x2 ID photos, and a strong passion to pursue an international cruise ship career. Age requirement is generally 18 to 35 years old.',
    category: 'General',
    display_order: 1,
    is_published: 1
  },
  {
    id: 2,
    faq_key: 'faq-2',
    question: 'Is the Saturday Orientation really FREE?',
    answer: 'Yes! Our Career Guidance Orientation is 100% free with no hidden obligation. It covers cruise line salary expectations, hiring qualifications, step-by-step application procedures, and academy scholarship options.',
    category: 'Orientation',
    display_order: 2,
    is_published: 1
  },
  {
    id: 3,
    faq_key: 'faq-3',
    question: 'Does Bluechef Global Academy offer job placement assistance?',
    answer: 'Yes. BGA has strategic partnerships and direct endorsements with leading POEA/DMW licensed manning agencies that recruit for Royal Caribbean, Carnival, Celebrity Cruises, MSC, Princess Cruises, and NCL.',
    category: 'Placement',
    display_order: 3,
    is_published: 1
  },
  {
    id: 4,
    faq_key: 'faq-4',
    question: 'Are BGA training programs TESDA accredited?',
    answer: 'Yes! All core training modules align with TESDA regulations and maritime industry STCW / MLC 2006 international standard guidelines.',
    category: 'Accreditation',
    display_order: 4,
    is_published: 1
  },
  {
    id: 5,
    faq_key: 'faq-5',
    question: 'Can I pay the training tuition in installment plans?',
    answer: 'Absolutely. We offer flexible zero-interest installment plans, early bird discounts, and partial sponsorship options to ensure financial ease for all aspiring seafarers.',
    category: 'Tuition',
    display_order: 5,
    is_published: 1
  },
  {
    id: 6,
    faq_key: 'faq-6',
    question: 'How long does it take from enrollment to embarking on a cruise ship?',
    answer: 'Training duration ranges from 1.5 to 3 months depending on the program. After completion and practical assessment, processing with manning agencies for medical, visa, and deployment usually takes 3 to 6 months.',
    category: 'Timeline',
    display_order: 6,
    is_published: 1
  }
];

let mockCmsPartners = [
  { id: 1, name: 'Royal Caribbean International', logo_url: null, display_order: 1, is_published: 1 },
  { id: 2, name: 'Carnival Cruise Line', logo_url: null, display_order: 2, is_published: 1 },
  { id: 3, name: 'Celebrity Cruises', logo_url: null, display_order: 3, is_published: 1 },
  { id: 4, name: 'MSC Cruises', logo_url: null, display_order: 4, is_published: 1 },
  { id: 5, name: 'Princess Cruises', logo_url: null, display_order: 5, is_published: 1 },
  { id: 6, name: 'Norwegian Cruise Line', logo_url: null, display_order: 6, is_published: 1 },
  { id: 7, name: 'Costa Cruises', logo_url: null, display_order: 7, is_published: 1 },
  { id: 8, name: 'Disney Cruise Line', logo_url: null, display_order: 8, is_published: 1 }
];

async function initDb() {
  if (USE_DEVELOPMENT_MEMORY) return;
  try {
    pool = mysql.createPool(dbConfig);
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    isDbConnected = true;
    console.log('✅ Connected to MySQL database [bga_admissions_db]');
  } catch {
    isDbConnected = false;
    console.log(IS_PRODUCTION
      ? 'MySQL unavailable; production requests will return a retryable service error.'
      : 'MySQL unavailable; using the development in-memory store.');
  }
}
await initDb();

app.get('/api/health', (_req, res) => {
  res.status(isDbConnected || !IS_PRODUCTION ? 200 : 503).json({
    status: isDbConnected ? 'ok' : IS_PRODUCTION ? 'unavailable' : 'development-fallback',
    persistentStore: isDbConnected ? 'mysql' : null
  });
});

// Never report successful production writes against the temporary in-memory store.
app.use('/api', (_req, res, next) => {
  if (IS_PRODUCTION && !isDbConnected) {
    return res.status(503).json({
      error: 'The admissions service is temporarily unavailable. Please retry shortly.'
    });
  }
  return next();
});

function toConfirmation(reservation, orientation) {
  return {
    reference_number: reservation.reference_number,
    full_name: reservation.full_name,
    reservation_status: reservation.status,
    orientation_title: orientation.title,
    orientation_branch: orientation.branch,
    orientation_venue: orientation.venue,
    orientation_date: orientation.date,
    orientation_start_time: orientation.start_time,
    orientation_end_time: orientation.end_time,
    submitted_at: reservation.created_at
  };
}

// Authentication Middleware
async function verifyAdminToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Admin token missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    const admin = isDbConnected
      ? (await pool.query('SELECT id, email, name FROM admins WHERE id = ? AND role = ?', [decoded.id, 'admin']))[0][0]
      : mockAdmins.find((item) => item.id === decoded.id);
    if (!admin) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.admin = { id: admin.id, email: admin.email, name: admin.name };
    return next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

// -----------------------------------------------------------------------------
// 1. AUTHENTICATION ENDPOINTS
// -----------------------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password || email.length > 255 || password.length > 1024) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (isDbConnected) {
    try {
      const [rows] = await pool.query(
        "SELECT id, email, name, password_hash FROM admins WHERE LOWER(email) = LOWER(?) AND role = 'admin' LIMIT 1",
        [email.trim()]
      );
      const admin = rows[0];
      const passwordIsValid = admin
        ? await passwordMatches(password, admin.password_hash)
        : false;

      if (!admin || !passwordIsValid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      const token = jwt.sign({ id: admin.id, email: admin.email, name: admin.name }, JWT_SECRET, { expiresIn: '12h' });
      return res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database authentication error.' });
    }
  } else {
    const admin = mockAdmins.find((a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign({ id: admin.id, email: admin.email, name: admin.name }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  }
});

app.get('/api/auth/me', verifyAdminToken, (req, res) => res.json({ admin: req.admin }));

// -----------------------------------------------------------------------------
// 2. ORIENTATION ENDPOINTS
// -----------------------------------------------------------------------------

// Complete schedules include drafts and are available only to admins.
app.get('/api/orientations', verifyAdminToken, async (req, res) => {
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
      remaining_slots: remainingSlots(o)
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

// Public booking list: only future schedules that can still accept reservations.
app.get('/api/orientations/public', async (req, res) => {
  const { branch, orientation_id } = req.query;

  if (isDbConnected) {
    try {
      let query = `
        SELECT *, (capacity - reserved) AS remaining_slots
        FROM orientations
        WHERE status IN ('Open', 'Published')
          AND date >= ?
          AND (capacity IS NULL OR reserved < capacity)
      `;
      const params = [todayInManila()];
      if (branch) {
        query += ' AND branch = ?';
        params.push(branch);
      }
      if (orientation_id) {
        query += ' AND id = ?';
        params.push(orientation_id);
      }
      query += ' ORDER BY date ASC, start_time ASC';
      const [rows] = await pool.query(query, params);
      return res.json(rows.filter((item) => isBookableOrientation(item)));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch available orientations.' });
    }
  }

  const result = mockOrientations
    .filter((item) => isBookableOrientation(item))
    .filter((item) => !branch || item.branch.toLowerCase() === branch.toLowerCase())
    .filter((item) => !orientation_id || String(item.id) === String(orientation_id))
    .map((item) => ({ ...item, remaining_slots: remainingSlots(item) }));
  return res.json(result);
});

// Create Orientation Event (Admin Only)
app.post('/api/orientations', verifyAdminToken, async (req, res) => {
  const { title, branch, venue, description, date, start_time, end_time, capacity, status } = req.body;

  if (!title || !branch || !venue || !date || capacity === undefined) {
    return res.status(400).json({ error: 'Title, branch, venue, date, and capacity are required.' });
  }

  let initialStatus = status || 'Published';
  let normalizedCapacity;
  try {
    const validated = validateOrientation({ ...req.body, start_time: start_time || '09:00 AM', status: initialStatus });
    initialStatus = validated.status;
    normalizedCapacity = validated.capacity;
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }

  if (isDbConnected) {
    try {
      const [result] = await pool.query(
        'INSERT INTO orientations (title, branch, venue, description, date, start_time, end_time, capacity, reserved, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
        [title, branch, venue, description || '', date, start_time || '09:00 AM', end_time || '12:00 PM', normalizedCapacity, initialStatus]
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
      capacity: normalizedCapacity,
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

  if (isDbConnected) {
    try {
      return res.json(await updateMySqlOrientation(pool, id, req.body));
    } catch (err) {
      if (err instanceof ReservationError) return res.status(err.status).json({ error: err.message });
      console.error(err);
      return res.status(500).json({ error: 'Failed to update orientation.' });
    }
  } else {
    const idx = mockOrientations.findIndex((o) => o.id === parseInt(id));
    if (idx === -1) return res.status(404).json({ error: 'Orientation not found.' });

    try {
      mockOrientations[idx] = validateOrientation(req.body, mockOrientations[idx]);
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }
    return res.json({ message: 'Orientation updated successfully', orientation: mockOrientations[idx] });
  }
});

// Update Status / Close Registration (Admin Only)
app.patch('/api/orientations/:id/status', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!ORIENTATION_STATUSES.includes(status)) return res.status(400).json({ error: 'A valid orientation status is required.' });

  if (isDbConnected) {
    try {
      return res.json(await updateMySqlOrientation(pool, id, { status }));
    } catch (err) {
      if (err instanceof ReservationError) return res.status(err.status).json({ error: err.message });
      console.error(err);
      return res.status(500).json({ error: 'Database error updating status.' });
    }
  } else {
    const orientation = mockOrientations.find((o) => o.id === parseInt(id));
    if (!orientation) return res.status(404).json({ error: 'Orientation not found.' });
    Object.assign(orientation, validateOrientation({ status }, orientation));
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
  let applicant;
  try {
    applicant = validateApplicant(req.body || {});
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
  const { orientation_id, full_name, phone, email, address, city, province, notes } = applicant;
  const refNumber = newReference();

  if (isDbConnected) {
    try {
      return res.status(201).json(await bookMySql(pool, applicant));
    } catch (err) {
      if (err instanceof ReservationError) return res.status(err.status).json({ error: err.message });
      console.error(err);
      return res.status(503).json({ error: 'The reservation service is temporarily unavailable. Please try again shortly.' });
    }
  } else {
    const orientation = mockOrientations.find((o) => o.id === parseInt(orientation_id));
    if (!orientation) {
      return res.status(404).json({ error: 'Selected orientation event not found.' });
    }

    if (!isBookableOrientation(orientation)) {
      return res.status(409).json({ error: 'Selected orientation event is no longer available.' });
    }

    // Duplicate check for fallback store
    const existingDuplicate = mockReservations.find(
      (r) =>
        (r.email.toLowerCase() === email.trim().toLowerCase() || normalizePhone(r.phone) === normalizePhone(phone)) &&

        r.status !== 'Cancelled'
    );

    if (existingDuplicate) {
      return res.status(409).json({
        error: 'You already have an active reservation under this email or phone number. Each applicant is allowed one active reservation to prevent duplicate bookings.'
      });
    }

    // Process reservation
    orientation.reserved += 1;
    if (orientation.capacity !== null && orientation.reserved >= orientation.capacity) {
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
      status: 'Confirmed',
      created_at: new Date().toISOString()
    };
    mockReservations.unshift(newRes);

    return res.status(201).json({
      message: 'Reservation confirmed successfully',
      status: 'Confirmed',
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

// Safe confirmation recovery: both reference number and phone must match.
app.post('/api/reservations/confirmation', async (req, res) => {
  const { reference_number, phone } = req.body;
  res.set('Cache-Control', 'no-store');
  if (typeof reference_number !== 'string' || !reference_number.trim() || reference_number.length > 50 || typeof phone !== 'string' || !/^\d{10,15}$/.test(normalizePhone(phone))) {
    return res.status(400).json({ error: 'Reference number and phone are required.' });
  }

  if (isDbConnected) {
    try {
      const [rows] = await pool.query(
        `SELECT
          r.reference_number,
          r.full_name,
          r.status AS reservation_status,
          o.title AS orientation_title,
          o.branch AS orientation_branch,
          o.venue AS orientation_venue,
          o.date AS orientation_date,
          o.start_time AS orientation_start_time,
          o.end_time AS orientation_end_time,
          r.created_at AS submitted_at
        FROM reservations r
        JOIN orientations o ON o.id = r.orientation_id
        WHERE UPPER(r.reference_number) = UPPER(?)
          AND REGEXP_REPLACE(r.phone, '[^0-9]', '') = ?
        LIMIT 1`,
        [reference_number.trim(), normalizePhone(phone)]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Reservation not found.' });
      return res.json(rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Unable to retrieve the confirmation.' });
    }
  }

  const reservation = mockReservations.find(
    (item) =>
      item.reference_number.toLowerCase() === reference_number.trim().toLowerCase() &&
      normalizePhone(item.phone) === normalizePhone(phone)
  );
  if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });
  const orientation = mockOrientations.find((item) => item.id === reservation.orientation_id);
  if (!orientation) return res.status(404).json({ error: 'Reservation not found.' });
  return res.json(toConfirmation(reservation, orientation));
});

// Applicant details lookup for review & edit (requires reference number + phone)
app.post('/api/reservations/applicant-details', async (req, res) => {
  const { reference_number, phone } = req.body || {};
  res.set('Cache-Control', 'no-store');
  if (typeof reference_number !== 'string' || !reference_number.trim() || reference_number.length > 50 || typeof phone !== 'string' || !/^\d{10,15}$/.test(normalizePhone(phone))) {
    return res.status(400).json({ error: 'Reference number and phone are required.' });
  }

  if (isDbConnected) {
    try {
      const [rows] = await pool.query(
        `SELECT
          r.reference_number,
          r.full_name,
          r.phone,
          r.email,
          r.address,
          r.city,
          r.province,
          r.notes,
          r.status AS reservation_status,
          o.id AS orientation_id,
          o.title AS orientation_title,
          o.branch AS orientation_branch,
          o.venue AS orientation_venue,
          o.date AS orientation_date,
          o.start_time AS orientation_start_time,
          o.end_time AS orientation_end_time,
          r.created_at AS submitted_at
        FROM reservations r
        JOIN orientations o ON o.id = r.orientation_id
        WHERE UPPER(r.reference_number) = UPPER(?)
          AND REGEXP_REPLACE(r.phone, '[^0-9]', '') = ?
        LIMIT 1`,
        [reference_number.trim(), normalizePhone(phone)]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Reservation not found.' });
      return res.json(rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Unable to retrieve reservation details.' });
    }
  }

  const reservation = mockReservations.find(
    (item) =>
      item.reference_number.toLowerCase() === reference_number.trim().toLowerCase() &&
      normalizePhone(item.phone) === normalizePhone(phone)
  );
  if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });
  const orientation = mockOrientations.find((item) => item.id === reservation.orientation_id);
  if (!orientation) return res.status(404).json({ error: 'Reservation not found.' });
  return res.json({
    reference_number: reservation.reference_number,
    full_name: reservation.full_name,
    phone: reservation.phone,
    email: reservation.email,
    address: reservation.address,
    city: reservation.city,
    province: reservation.province,
    notes: reservation.notes,
    reservation_status: reservation.status,
    orientation_id: orientation.id,
    orientation_title: orientation.title,
    orientation_branch: orientation.branch,
    orientation_venue: orientation.venue,
    orientation_date: orientation.date,
    orientation_start_time: orientation.start_time,
    orientation_end_time: orientation.end_time,
    submitted_at: reservation.created_at
  });
});

// Applicant update endpoint for correcting typographical errors
app.patch('/api/reservations/applicant-update', async (req, res) => {
  const { reference_number, phone } = req.body || {};
  res.set('Cache-Control', 'no-store');
  if (typeof reference_number !== 'string' || !reference_number.trim() || typeof phone !== 'string' || !/^\d{10,15}$/.test(normalizePhone(phone))) {
    return res.status(400).json({ error: 'Reference number and current phone number are required.' });
  }

  if (isDbConnected) {
    try {
      const updated = await updateApplicantReservationMySql(pool, req.body);
      return res.json({ message: 'Reservation details updated successfully.', reservation: updated });
    } catch (err) {
      if (err instanceof ReservationError) return res.status(err.status).json({ error: err.message });
      console.error(err);
      return res.status(500).json({ error: 'Unable to update reservation details.' });
    }
  }

  const reservation = mockReservations.find(
    (item) =>
      item.reference_number.toLowerCase() === reference_number.trim().toLowerCase() &&
      normalizePhone(item.phone) === normalizePhone(phone)
  );
  if (!reservation) return res.status(404).json({ error: 'Reservation not found or phone number does not match.' });
  if (reservation.status === 'Cancelled') return res.status(400).json({ error: 'Cancelled reservations cannot be edited.' });

  let validated;
  try {
    validated = validateApplicant({
      orientation_id: reservation.orientation_id,
      full_name: req.body.full_name ?? reservation.full_name,
      phone: req.body.new_phone || req.body.phone || reservation.phone,
      email: req.body.email ?? reservation.email,
      address: req.body.address ?? reservation.address,
      city: req.body.city ?? reservation.city,
      province: req.body.province ?? reservation.province,
      notes: req.body.notes !== undefined ? req.body.notes : reservation.notes
    });
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  const duplicate = mockReservations.find(
    (r) =>
      r.id !== reservation.id &&
      r.status !== 'Cancelled' &&
      (r.email.toLowerCase() === validated.email.toLowerCase() || normalizePhone(r.phone) === normalizePhone(validated.phone))
  );
  if (duplicate) {
    return res.status(409).json({ error: 'Another active reservation already exists under this email or phone number.' });
  }

  reservation.full_name = validated.full_name;
  reservation.phone = validated.phone;
  reservation.email = validated.email;
  reservation.address = validated.address;
  reservation.city = validated.city;
  reservation.province = validated.province;
  reservation.notes = validated.notes;

  const orientation = mockOrientations.find((o) => o.id === reservation.orientation_id);
  const updatedConfirmation = {
    reference_number: reservation.reference_number,
    full_name: reservation.full_name,
    phone: reservation.phone,
    email: reservation.email,
    address: reservation.address,
    city: reservation.city,
    province: reservation.province,
    notes: reservation.notes,
    reservation_status: reservation.status,
    orientation_title: orientation?.title || '',
    orientation_branch: orientation?.branch || '',
    orientation_venue: orientation?.venue || '',
    orientation_date: orientation?.date || '',
    orientation_start_time: orientation?.start_time || '',
    orientation_end_time: orientation?.end_time || '',
    submitted_at: reservation.created_at
  };

  return res.json({ message: 'Reservation details updated successfully.', reservation: updatedConfirmation });
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
        orientation_date: o.date || null,
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
    try {
      return res.json(await changeMySqlReservationStatus(pool, id, status));
    } catch (err) {
      if (err instanceof ReservationError) return res.status(err.status).json({ error: err.message });
      console.error(err);
      return res.status(503).json({ error: 'The reservation service is temporarily unavailable. Please try again shortly.' });
    }
  } else {
    const reservation = mockReservations.find((r) => r.id === parseInt(id));
    if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });

    const prevStatus = reservation.status;

    const orientation = mockOrientations.find((o) => o.id === reservation.orientation_id);
    if (!orientation) return res.status(404).json({ error: 'Orientation not found.' });
    if (prevStatus === 'Cancelled' && status !== 'Cancelled' && mockReservations.some((item) => item.id !== reservation.id
      && item.orientation_id === reservation.orientation_id && item.status !== 'Cancelled'
      && (item.email.trim().toLowerCase() === reservation.email.trim().toLowerCase() || normalizePhone(item.phone) === normalizePhone(reservation.phone)))) {
      return res.status(409).json({ error: 'You have already submitted a reservation for this orientation session using this email or phone number.' });
    }
    try {
      Object.assign(orientation, seatChange(orientation, prevStatus, status));
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }

    reservation.status = status;

    return res.json({ message: `Reservation status updated to ${status}`, reservation });
  }
});

// -----------------------------------------------------------------------------
// 4. IMAGE UPLOAD ENDPOINT
// -----------------------------------------------------------------------------
registerCmsRoutes(app, {
  store: { programs: mockCmsPrograms, branches: mockCmsBranches, gallery: mockCmsGallery,
    testimonials: mockCmsTestimonials, faqs: mockCmsFaqs, stats: mockStats.map((row) => ({ ...row, is_published: true })), partners: mockCmsPartners },
  settings: mockSiteSettings, getPool: () => isDbConnected ? pool : null,
  authenticate: verifyAdminToken, uploadsDir
});

registerPublishingRoutes(app, { getPool: () => isDbConnected ? pool : null, authenticate: verifyAdminToken });

// Start Express Listener
const listener = app.listen(PORT, () => {
  console.log(`Bluechef Global Academy Express REST Server running on port ${listener.address().port}`);
});
