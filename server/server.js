import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
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

// Ensure public/uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
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

// CMS Standalone Mock Dataset
let mockSiteSettings = {
  hero_badge: 'TESDA Accredited • International Cruise Placement',
  hero_headline: 'Crafting World-Class Careers on',
  hero_headline_highlight: 'International Cruise Ships',
  hero_subheadline: 'TESDA-accredited culinary, hospitality, and maritime training programs designed to prepare aspiring seafarers for high-paying contracts on luxury ocean liners.',
  hero_primary_cta_text: 'Reserve Free Orientation',
  hero_secondary_cta_text: 'Explore Programs',
  hero_trust_badges: JSON.stringify(['100% Free Career Orientation', 'Zero Prior Experience Required', 'POEA Manning Agency Endorsements']),
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

function normalizePhone(value = '') {
  return String(value).replace(/\D/g, '');
}

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

// Public booking list: only future schedules that can still accept reservations.
app.get('/api/orientations/public', async (req, res) => {
  const { branch, orientation_id } = req.query;

  if (isDbConnected) {
    try {
      let query = `
        SELECT *, (capacity - reserved) AS remaining_slots
        FROM orientations
        WHERE status IN ('Open', 'Published')
          AND date >= CURDATE()
          AND reserved < capacity
      `;
      const params = [];
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
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch available orientations.' });
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const result = mockOrientations
    .filter((item) => ['Open', 'Published'].includes(item.status))
    .filter((item) => item.date >= today && item.reserved < item.capacity)
    .filter((item) => !branch || item.branch.toLowerCase() === branch.toLowerCase())
    .filter((item) => !orientation_id || String(item.id) === String(orientation_id))
    .map((item) => ({ ...item, remaining_slots: item.capacity - item.reserved }));
  return res.json(result);
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

  // High-entropy, human-readable reference number.
  const refNumber = `BGA-${new Date().getFullYear()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

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

// Safe confirmation recovery: both reference number and phone must match.
app.post('/api/reservations/confirmation', async (req, res) => {
  const { reference_number, phone } = req.body;
  if (!reference_number || !phone) {
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

// -----------------------------------------------------------------------------
// 4. IMAGE UPLOAD ENDPOINT
// -----------------------------------------------------------------------------
app.post('/api/upload', verifyAdminToken, (req, res) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required.' });
    }

    if (imageBase64.startsWith('http://') || imageBase64.startsWith('https://')) {
      return res.json({ url: imageBase64 });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const extMatch = imageBase64.match(/^data:image\/(\w+);base64,/);
    const ext = extMatch ? extMatch[1] : 'jpg';

    const safeName = (filename || 'upload').replace(/[^a-zA-Z0-9_-]/g, '');
    const newFilename = `bga_${safeName}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, newFilename);

    fs.writeFile(filePath, base64Data, 'base64', (err) => {
      if (err) {
        console.error('File write error:', err);
        return res.json({ url: imageBase64, warning: 'Saved as inline data URI' });
      }
      return res.json({ url: `/uploads/${newFilename}`, filename: newFilename });
    });
  } catch (err) {
    console.error('Upload processing error:', err);
    return res.status(500).json({ error: 'Failed to process image upload.' });
  }
});

// -----------------------------------------------------------------------------
// 5. PUBLIC AGGREGATED CMS CONTENT ENDPOINT
// -----------------------------------------------------------------------------
app.get('/api/content/public', async (req, res) => {
  if (isDbConnected) {
    try {
      const [settingsRows] = await pool.query('SELECT setting_key, setting_value FROM site_settings');
      const settingsMap = {};
      settingsRows.forEach((r) => {
        settingsMap[r.setting_key] = r.setting_value;
      });

      const [statsRows] = await pool.query('SELECT * FROM cms_stats ORDER BY display_order ASC');
      const [programsRows] = await pool.query('SELECT * FROM cms_programs WHERE is_published = 1 ORDER BY display_order ASC');
      const programs = programsRows.map((p) => ({
        ...p,
        highlights: typeof p.highlights === 'string' ? JSON.parse(p.highlights) : p.highlights
      }));

      const [branchesRows] = await pool.query('SELECT * FROM cms_branches WHERE is_published = 1 ORDER BY display_order ASC');
      const branches = branchesRows.map((b) => ({
        ...b,
        features: typeof b.features === 'string' ? JSON.parse(b.features) : b.features
      }));

      const [galleryRows] = await pool.query('SELECT * FROM cms_gallery WHERE is_published = 1 ORDER BY display_order ASC');
      const [testimonialsRows] = await pool.query('SELECT * FROM cms_testimonials WHERE is_published = 1 ORDER BY display_order ASC');
      const [faqsRows] = await pool.query('SELECT * FROM cms_faqs WHERE is_published = 1 ORDER BY display_order ASC');
      const [partnersRows] = await pool.query('SELECT * FROM cms_partners WHERE is_published = 1 ORDER BY display_order ASC');

      return res.json({
        settings: { ...mockSiteSettings, ...settingsMap },
        stats: statsRows.length > 0 ? statsRows : mockStats,
        programs: programs.length > 0 ? programs : mockCmsPrograms,
        branches: branches.length > 0 ? branches : mockCmsBranches,
        gallery: galleryRows.length > 0 ? galleryRows : mockCmsGallery,
        testimonials: testimonialsRows.length > 0 ? testimonialsRows : mockCmsTestimonials,
        faqs: faqsRows.length > 0 ? faqsRows : mockCmsFaqs,
        partners: partnersRows.length > 0 ? partnersRows : mockCmsPartners
      });
    } catch (err) {
      console.error('Public CMS fetch error:', err);
      return res.json({
        settings: mockSiteSettings,
        stats: mockStats,
        programs: mockCmsPrograms,
        branches: mockCmsBranches,
        gallery: mockCmsGallery,
        testimonials: mockCmsTestimonials,
        faqs: mockCmsFaqs,
        partners: mockCmsPartners
      });
    }
  } else {
    const formattedPrograms = mockCmsPrograms.map((p) => ({
      ...p,
      highlights: typeof p.highlights === 'string' ? JSON.parse(p.highlights) : p.highlights
    }));
    const formattedBranches = mockCmsBranches.map((b) => ({
      ...b,
      features: typeof b.features === 'string' ? JSON.parse(b.features) : b.features
    }));

    return res.json({
      settings: mockSiteSettings,
      stats: mockStats,
      programs: formattedPrograms,
      branches: formattedBranches,
      gallery: mockCmsGallery.filter((g) => g.is_published),
      testimonials: mockCmsTestimonials.filter((t) => t.is_published),
      faqs: mockCmsFaqs.filter((f) => f.is_published),
      partners: mockCmsPartners.filter((p) => p.is_published)
    });
  }
});

// -----------------------------------------------------------------------------
// 6. ADMIN CMS MANAGEMENT ENDPOINTS
// -----------------------------------------------------------------------------

app.get('/api/admin/content/all', verifyAdminToken, async (req, res) => {
  if (isDbConnected) {
    try {
      const [settingsRows] = await pool.query('SELECT * FROM site_settings');
      const settingsMap = {};
      settingsRows.forEach((r) => {
        settingsMap[r.setting_key] = r.setting_value;
      });

      const [statsRows] = await pool.query('SELECT * FROM cms_stats ORDER BY display_order ASC');
      const [programsRows] = await pool.query('SELECT * FROM cms_programs ORDER BY display_order ASC');
      const [branchesRows] = await pool.query('SELECT * FROM cms_branches ORDER BY display_order ASC');
      const [galleryRows] = await pool.query('SELECT * FROM cms_gallery ORDER BY display_order ASC');
      const [testimonialsRows] = await pool.query('SELECT * FROM cms_testimonials ORDER BY display_order ASC');
      const [faqsRows] = await pool.query('SELECT * FROM cms_faqs ORDER BY display_order ASC');
      const [partnersRows] = await pool.query('SELECT * FROM cms_partners ORDER BY display_order ASC');

      return res.json({
        settings: { ...mockSiteSettings, ...settingsMap },
        stats: statsRows.length > 0 ? statsRows : mockStats,
        programs: programsRows.length > 0 ? programsRows : mockCmsPrograms,
        branches: branchesRows.length > 0 ? branchesRows : mockCmsBranches,
        gallery: galleryRows.length > 0 ? galleryRows : mockCmsGallery,
        testimonials: testimonialsRows.length > 0 ? testimonialsRows : mockCmsTestimonials,
        faqs: faqsRows.length > 0 ? faqsRows : mockCmsFaqs,
        partners: partnersRows.length > 0 ? partnersRows : mockCmsPartners
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch admin CMS data.' });
    }
  } else {
    return res.json({
      settings: mockSiteSettings,
      stats: mockStats,
      programs: mockCmsPrograms,
      branches: mockCmsBranches,
      gallery: mockCmsGallery,
      testimonials: mockCmsTestimonials,
      faqs: mockCmsFaqs,
      partners: mockCmsPartners
    });
  }
});

app.put('/api/admin/settings', verifyAdminToken, async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Settings object is required.' });
  }

  if (isDbConnected) {
    try {
      for (const [key, value] of Object.entries(settings)) {
        const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        await pool.query(
          'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
          [key, valStr]
        );
      }
      return res.json({ message: 'Site settings updated successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error updating settings.' });
    }
  } else {
    for (const [key, value] of Object.entries(settings)) {
      mockSiteSettings[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
    return res.json({ message: 'Site settings updated successfully', settings: mockSiteSettings });
  }
});

// Programs CRUD
app.post('/api/admin/programs', verifyAdminToken, async (req, res) => {
  const { title, category, badge, short_description, duration, eligibility, image, overview, highlights, display_order, is_published } = req.body;
  const program_id = req.body.program_id || title.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const highlightsStr = JSON.stringify(highlights || []);

  if (isDbConnected) {
    try {
      const [resObj] = await pool.query(
        'INSERT INTO cms_programs (program_id, title, category, badge, short_description, duration, eligibility, image, overview, highlights, display_order, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [program_id, title, category || 'General', badge || 'Standard', short_description, duration, eligibility, image || '/images/culinary_lab.jpg', overview, highlightsStr, display_order || 0, is_published !== undefined ? is_published : 1]
      );
      return res.status(201).json({ message: 'Program created successfully', id: resObj.insertId });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create program.' });
    }
  } else {
    const newId = mockCmsPrograms.length > 0 ? Math.max(...mockCmsPrograms.map((p) => p.id)) + 1 : 1;
    const newProgram = {
      id: newId,
      program_id,
      title,
      category: category || 'General',
      badge: badge || 'Standard',
      short_description,
      duration,
      eligibility,
      image: image || '/images/culinary_lab.jpg',
      overview,
      highlights: highlightsStr,
      display_order: display_order || 0,
      is_published: is_published !== undefined ? is_published : 1
    };
    mockCmsPrograms.push(newProgram);
    return res.status(201).json({ message: 'Program created successfully', id: newId, program: newProgram });
  }
});

app.put('/api/admin/programs/:id', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { title, category, badge, short_description, duration, eligibility, image, overview, highlights, display_order, is_published } = req.body;
  const highlightsStr = JSON.stringify(highlights || []);

  if (isDbConnected) {
    try {
      await pool.query(
        'UPDATE cms_programs SET title=?, category=?, badge=?, short_description=?, duration=?, eligibility=?, image=?, overview=?, highlights=?, display_order=?, is_published=? WHERE id=?',
        [title, category, badge, short_description, duration, eligibility, image, overview, highlightsStr, display_order, is_published, id]
      );
      return res.json({ message: 'Program updated successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update program.' });
    }
  } else {
    const idx = mockCmsPrograms.findIndex((p) => p.id === parseInt(id));
    if (idx === -1) return res.status(404).json({ error: 'Program not found.' });
    mockCmsPrograms[idx] = {
      ...mockCmsPrograms[idx],
      title, category, badge, short_description, duration, eligibility, image, overview,
      highlights: highlightsStr,
      display_order, is_published
    };
    return res.json({ message: 'Program updated successfully', program: mockCmsPrograms[idx] });
  }
});

app.delete('/api/admin/programs/:id', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  if (isDbConnected) {
    try {
      await pool.query('DELETE FROM cms_programs WHERE id=?', [id]);
      return res.json({ message: 'Program deleted successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete program.' });
    }
  } else {
    mockCmsPrograms = mockCmsPrograms.filter((p) => p.id !== parseInt(id));
    return res.json({ message: 'Program deleted successfully' });
  }
});

// Gallery CRUD
app.post('/api/admin/gallery', verifyAdminToken, async (req, res) => {
  const { title, category, image, display_order, is_published } = req.body;
  if (isDbConnected) {
    try {
      const [resObj] = await pool.query(
        'INSERT INTO cms_gallery (title, category, image, display_order, is_published) VALUES (?, ?, ?, ?, ?)',
        [title, category || 'Training', image, display_order || 0, is_published !== undefined ? is_published : 1]
      );
      return res.status(201).json({ message: 'Gallery item added', id: resObj.insertId });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to add gallery item.' });
    }
  } else {
    const newId = mockCmsGallery.length > 0 ? Math.max(...mockCmsGallery.map((g) => g.id)) + 1 : 1;
    const item = { id: newId, title, category: category || 'Training', image, display_order: display_order || 0, is_published: is_published !== undefined ? is_published : 1 };
    mockCmsGallery.push(item);
    return res.status(201).json({ message: 'Gallery item added', item });
  }
});

app.put('/api/admin/gallery/:id', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { title, category, image, display_order, is_published } = req.body;
  if (isDbConnected) {
    try {
      await pool.query(
        'UPDATE cms_gallery SET title=?, category=?, image=?, display_order=?, is_published=? WHERE id=?',
        [title, category, image, display_order, is_published, id]
      );
      return res.json({ message: 'Gallery item updated' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update gallery item.' });
    }
  } else {
    const idx = mockCmsGallery.findIndex((g) => g.id === parseInt(id));
    if (idx === -1) return res.status(404).json({ error: 'Gallery item not found.' });
    mockCmsGallery[idx] = { ...mockCmsGallery[idx], title, category, image, display_order, is_published };
    return res.json({ message: 'Gallery item updated', item: mockCmsGallery[idx] });
  }
});

app.delete('/api/admin/gallery/:id', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  if (isDbConnected) {
    try {
      await pool.query('DELETE FROM cms_gallery WHERE id=?', [id]);
      return res.json({ message: 'Gallery item deleted' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete gallery item.' });
    }
  } else {
    mockCmsGallery = mockCmsGallery.filter((g) => g.id !== parseInt(id));
    return res.json({ message: 'Gallery item deleted' });
  }
});

// Testimonials CRUD
app.post('/api/admin/testimonials', verifyAdminToken, async (req, res) => {
  const { name, role, company, quote, avatar, branch_tag, display_order, is_published } = req.body;
  if (isDbConnected) {
    try {
      const [resObj] = await pool.query(
        'INSERT INTO cms_testimonials (name, role, company, quote, avatar, branch_tag, display_order, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, role, company, quote, avatar || 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=250&q=80', branch_tag, display_order || 0, is_published !== undefined ? is_published : 1]
      );
      return res.status(201).json({ message: 'Testimonial added', id: resObj.insertId });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to add testimonial.' });
    }
  } else {
    const newId = mockCmsTestimonials.length > 0 ? Math.max(...mockCmsTestimonials.map((t) => t.id)) + 1 : 1;
    const item = { id: newId, name, role, company, quote, avatar, branch_tag, display_order: display_order || 0, is_published: is_published !== undefined ? is_published : 1 };
    mockCmsTestimonials.push(item);
    return res.status(201).json({ message: 'Testimonial added', item });
  }
});

app.put('/api/admin/testimonials/:id', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { name, role, company, quote, avatar, branch_tag, display_order, is_published } = req.body;
  if (isDbConnected) {
    try {
      await pool.query(
        'UPDATE cms_testimonials SET name=?, role=?, company=?, quote=?, avatar=?, branch_tag=?, display_order=?, is_published=? WHERE id=?',
        [name, role, company, quote, avatar, branch_tag, display_order, is_published, id]
      );
      return res.json({ message: 'Testimonial updated' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update testimonial.' });
    }
  } else {
    const idx = mockCmsTestimonials.findIndex((t) => t.id === parseInt(id));
    if (idx === -1) return res.status(404).json({ error: 'Testimonial not found.' });
    mockCmsTestimonials[idx] = { ...mockCmsTestimonials[idx], name, role, company, quote, avatar, branch_tag, display_order, is_published };
    return res.json({ message: 'Testimonial updated', item: mockCmsTestimonials[idx] });
  }
});

app.delete('/api/admin/testimonials/:id', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  if (isDbConnected) {
    try {
      await pool.query('DELETE FROM cms_testimonials WHERE id=?', [id]);
      return res.json({ message: 'Testimonial deleted' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete testimonial.' });
    }
  } else {
    mockCmsTestimonials = mockCmsTestimonials.filter((t) => t.id !== parseInt(id));
    return res.json({ message: 'Testimonial deleted' });
  }
});

// FAQs CRUD
app.post('/api/admin/faqs', verifyAdminToken, async (req, res) => {
  const { question, answer, category, display_order, is_published } = req.body;
  const faq_key = req.body.faq_key || `faq-${Date.now()}`;
  if (isDbConnected) {
    try {
      const [resObj] = await pool.query(
        'INSERT INTO cms_faqs (faq_key, question, answer, category, display_order, is_published) VALUES (?, ?, ?, ?, ?, ?)',
        [faq_key, question, answer, category || 'General', display_order || 0, is_published !== undefined ? is_published : 1]
      );
      return res.status(201).json({ message: 'FAQ created', id: resObj.insertId });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create FAQ.' });
    }
  } else {
    const newId = mockCmsFaqs.length > 0 ? Math.max(...mockCmsFaqs.map((f) => f.id)) + 1 : 1;
    const item = { id: newId, faq_key, question, answer, category: category || 'General', display_order: display_order || 0, is_published: is_published !== undefined ? is_published : 1 };
    mockCmsFaqs.push(item);
    return res.status(201).json({ message: 'FAQ created', item });
  }
});

app.put('/api/admin/faqs/:id', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { question, answer, category, display_order, is_published } = req.body;
  if (isDbConnected) {
    try {
      await pool.query(
        'UPDATE cms_faqs SET question=?, answer=?, category=?, display_order=?, is_published=? WHERE id=?',
        [question, answer, category, display_order, is_published, id]
      );
      return res.json({ message: 'FAQ updated' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update FAQ.' });
    }
  } else {
    const idx = mockCmsFaqs.findIndex((f) => f.id === parseInt(id));
    if (idx === -1) return res.status(404).json({ error: 'FAQ not found.' });
    mockCmsFaqs[idx] = { ...mockCmsFaqs[idx], question, answer, category, display_order, is_published };
    return res.json({ message: 'FAQ updated', item: mockCmsFaqs[idx] });
  }
});

app.delete('/api/admin/faqs/:id', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  if (isDbConnected) {
    try {
      await pool.query('DELETE FROM cms_faqs WHERE id=?', [id]);
      return res.json({ message: 'FAQ deleted' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete FAQ.' });
    }
  } else {
    mockCmsFaqs = mockCmsFaqs.filter((f) => f.id !== parseInt(id));
    return res.json({ message: 'FAQ deleted' });
  }
});

// Branches CRUD
app.post('/api/admin/branches', verifyAdminToken, async (req, res) => {
  const { name, address, phone, email, hours, map_url, image, features, display_order, is_published } = req.body;
  const branch_key = req.body.branch_key || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const featuresStr = JSON.stringify(features || []);

  if (isDbConnected) {
    try {
      const [resObj] = await pool.query(
        'INSERT INTO cms_branches (branch_key, name, address, phone, email, hours, map_url, image, features, display_order, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [branch_key, name, address, phone, email, hours, map_url, image || '/images/hero_cruise_ship.jpg', featuresStr, display_order || 0, is_published !== undefined ? is_published : 1]
      );
      return res.status(201).json({ message: 'Branch created', id: resObj.insertId });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create branch.' });
    }
  } else {
    const newId = mockCmsBranches.length > 0 ? Math.max(...mockCmsBranches.map((b) => b.id)) + 1 : 1;
    const item = { id: newId, branch_key, name, address, phone, email, hours, map_url, image: image || '/images/hero_cruise_ship.jpg', features: featuresStr, display_order: display_order || 0, is_published: is_published !== undefined ? is_published : 1 };
    mockCmsBranches.push(item);
    return res.status(201).json({ message: 'Branch created', item });
  }
});

app.put('/api/admin/branches/:id', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { name, address, phone, email, hours, map_url, image, features, display_order, is_published } = req.body;
  const featuresStr = JSON.stringify(features || []);

  if (isDbConnected) {
    try {
      await pool.query(
        'UPDATE cms_branches SET name=?, address=?, phone=?, email=?, hours=?, map_url=?, image=?, features=?, display_order=?, is_published=? WHERE id=?',
        [name, address, phone, email, hours, map_url, image, featuresStr, display_order, is_published, id]
      );
      return res.json({ message: 'Branch updated' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update branch.' });
    }
  } else {
    const idx = mockCmsBranches.findIndex((b) => b.id === parseInt(id));
    if (idx === -1) return res.status(404).json({ error: 'Branch not found.' });
    mockCmsBranches[idx] = { ...mockCmsBranches[idx], name, address, phone, email, hours, map_url, image, features: featuresStr, display_order, is_published };
    return res.json({ message: 'Branch updated', item: mockCmsBranches[idx] });
  }
});

app.delete('/api/admin/branches/:id', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  if (isDbConnected) {
    try {
      await pool.query('DELETE FROM cms_branches WHERE id=?', [id]);
      return res.json({ message: 'Branch deleted' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete branch.' });
    }
  } else {
    mockCmsBranches = mockCmsBranches.filter((b) => b.id !== parseInt(id));
    return res.json({ message: 'Branch deleted' });
  }
});

// Start Express Listener
app.listen(PORT, () => {
  console.log(`🚀 Bluechef Global Academy Express REST Server running on port ${PORT}`);
});
