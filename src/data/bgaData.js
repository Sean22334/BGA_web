export const ACADEMY_STATS = [
  { id: 'years', value: '12+', label: 'Years of Excellence', icon: 'Award' },
  { id: 'graduates', value: '8,500+', label: 'Successful Graduates', icon: 'Users' },
  { id: 'centers', value: '4', label: 'Training Centers', icon: 'MapPin' },
];

export const PROGRAMS = [
  {
    id: 'culinary',
    title: 'Culinary Arts for Cruise Ships',
    shortDescription: 'Master international galley operations, fine dining preparation, HACCP food safety, and high-volume cruise kitchen management.',
    duration: '5 days training',
    eligibility: 'High School Grad / College Level (21-45 y/o)',
    category: 'Culinary',
    badge: 'Most Popular',
    image: '/images/culinary_lab.jpg',
    overview: 'Designed specifically for luxury international cruise line galley operations. Trainees undergo rigorous hands-on practice in commercial-grade kitchens learning continental cuisine, butchery, pastry, menu execution, and USPH standards.',
    highlights: [
      'USPH & HACCP Food Safety Certification Prep',
      'High-Volume Buffet & Fine Dining Plating',
      'Galley Workflow & Kitchen Safety Protocol',
      'Direct Recruitment Endorsement to Partner Agencies'
    ]
  },
  /*
  {
    id: 'fnb-service',
    title: 'Food & Beverage Service & Bartending',
    shortDescription: 'Comprehensive training in luxury restaurant service, wine pairing, cocktail mixology, and high-standard guest relations on cruise ships.',
    duration: '2.5 Months Intensive',
    eligibility: 'High School Grad / Hospitality Enthusiasts (18-35 y/o)',
    category: 'Hospitality',
    badge: 'High Demand',
    image: '/images/fnb_service.jpg',
    overview: 'Prepares seafarers for roles such as Assistant Waiter, Bar Waiter, Bartender, and Dining Room Attendant on luxury oceanliners. Focuses on silver service, tray handling, cocktail creation, and international guest interaction.',
    highlights: [
      'International Table Service & Protocol',
      'Cocktail Mixology & Beverage Knowledge',
      'POS Systems & Shipboard Cashless Transactions',
      'Maritime English & Cross-Cultural Communication'
    ]
  },
  /*{
    id: 'housekeeping',
    title: 'Housekeeping & Cabin Operations',
    shortDescription: 'Learn luxury stateroom preparation, bed making, towel origami, sanitation standards, and public area maintenance for cruise liners.',
    duration: '2 Months Intensive',
    eligibility: 'High School Grad / Vocational Graduate (18-35 y/o)',
    category: 'Hospitality',
    badge: 'Fast-Track',
    image: '/images/hero_cruise_ship.jpg',
    overview: 'Trains aspiring cabin stewards and public area attendants to deliver 5-star hotel luxury standards onboard. Includes infection control, laundry operations, chemical handling, and personalized guest service.',
    highlights: [
      'Stateroom & Suite VIP Service Standards',
      'Towel Art & Luxury Turndown Service',
      'USPH Environmental Sanitation Standards',
      'Cabin Inspection Checklist & Inventory'
    ]
  },
  */
  /*
   {
     id: 'catering-mgmt',
     title: 'Cruise Ship Catering & Galley Management',
     shortDescription: 'Advanced operational management for culinary professionals aiming for supervisory roles, provision handling, and galley logistics.',
     duration: '4 Months Advanced',
     eligibility: 'Culinary Graduate or 1+ Year Kitchen Experience',
     category: 'Management',
     badge: 'Executive',
     image: '/images/culinary_lab.jpg',
     overview: 'Targeted at culinary practitioners seeking career advancement onboard. Covers food cost control, inventory management, menu design, kitchen leadership, and regulatory compliance.',
     highlights: [
       'Provision Control & Inventory Auditing',
       'Menu Engineering & Cost Efficiency',
       'Galley Leadership & Team Scheduling',
       'Maritime Health & Environmental Audits'
     ]
   },
   */
  /*{
    id: 'maritime-english',
    title: 'Maritime English & Guest Services Specialist',
    shortDescription: 'Specialized language fluency, interview confidence coaching, front desk reception, and guest relations training tailored for cruise lines.',
    duration: '1.5 Months Intensive',
    eligibility: 'Open to all aspiring cruise personnel',
    category: 'General',
    badge: 'Essential',
    image: '/images/graduation_ceremony.jpg',
    overview: 'Prepares candidates to pass tough cruise line hiring interviews and English proficiency assessments (Marlins Test), while mastering front desk reception and guest service resolution.',
    highlights: [
      'Cruise Line Job Interview Simulation',
      'Marlins Test & English Proficiency Prep',
      'Front Desk Concierge & Complaint Resolution',
      'Cultural Sensitivity & Maritime Etiquette'
    ]
  }
  */
];

export const BRANCHES = [
  {
    id: 'tagum',
    name: 'Tagum Main Branch',
    address: 'BGA Building, National Highway, Tagum City, Davao del Norte, Philippines',
    phone: '+63 917 123 4567 / (084) 216-9876',
    email: 'tagum@bluechefglobal.com',
    hours: 'Mon - Sat: 8:00 AM - 5:00 PM',
    mapUrl: 'https://maps.google.com/?q=Tagum+City+Davao+del+Norte',
    image: '/images/hero_cruise_ship.jpg',
    features: ['Main Assessment Center', 'Full Commercial Kitchen Lab', 'Mock Cruise Suite']
  },
  {
    id: 'butuan',
    name: 'Butuan City Branch',
    address: 'J.C. Aquino Avenue, Brgy. Bayanihan, Butuan City, Agusan del Norte',
    phone: '+63 928 987 6543 / (085) 815-4321',
    email: 'butuan@bluechefglobal.com',
    hours: 'Mon - Sat: 8:00 AM - 5:00 PM',
    mapUrl: 'https://maps.google.com/?q=Butuan+City+Agusan+del+Norte',
    image: '/images/culinary_lab.jpg',
    features: ['Hospitality Training Lab', 'Mixology Bar Studio', 'Interview Prep Suite']
  },
  {
    id: 'pagadian',
    name: 'Pagadian City Branch',
    address: 'Rizal Avenue, Tuburan, Pagadian City, Zamboanga del Sur',
    phone: '+63 939 456 7890 / (062) 925-1122',
    email: 'pagadian@bluechefglobal.com',
    hours: 'Mon - Sat: 8:00 AM - 5:00 PM',
    mapUrl: 'https://maps.google.com/?q=Pagadian+City+Zamboanga+del+Sur',
    image: '/images/fnb_service.jpg',
    features: ['Culinary Workshop Suite', 'Multimedia Classroom', 'Orientation Hall']
  },
  {
    id: 'bacolod',
    name: 'Bacolod City Branch',
    address: 'Lacson Street, Mandalagan, Bacolod City, Negros Occidental',
    phone: '+63 919 654 3210 / (034) 433-8899',
    email: 'bacolod@bluechefglobal.com',
    hours: 'Mon - Sat: 8:00 AM - 5:00 PM',
    mapUrl: 'https://maps.google.com/?q=Bacolod+City+Negros+Occidental',
    image: '/images/graduation_ceremony.jpg',
    features: ['Modern Culinary Kitchen', 'Dining Service Room', 'Career Guidance Center']
  }
];

export const GALLERY_ITEMS = [
  { id: 1, category: 'Training', title: 'Hands-on Culinary Butchery Class', image: '/images/culinary_lab.jpg' },
  { id: 2, category: 'Kitchen Lab', title: 'Commercial Pastry & Baking Suite', image: '/images/culinary_lab.jpg' },
  { id: 3, category: 'Orientation', title: 'Free Weekly Career Orientation', image: '/images/hero_cruise_ship.jpg' },
  { id: 4, category: 'Graduation', title: 'Class 2025 Pinning & Graduation', image: '/images/graduation_ceremony.jpg' },
  { id: 5, category: 'Student Activities', title: 'Flaming Cocktail Mixology Demo', image: '/images/fnb_service.jpg' },
  { id: 6, category: 'Training', title: 'Fine Dining Silver Service Practice', image: '/images/fnb_service.jpg' },
  { id: 7, category: 'Kitchen Lab', title: 'USPH Kitchen Sanitation Audit', image: '/images/culinary_lab.jpg' },
  { id: 8, category: 'Student Activities', title: 'Team Building & Maritime Drills', image: '/images/graduation_ceremony.jpg' }
];

export const TESTIMONIALS = [
  {
    id: 1,
    name: 'Chef Mark Anthony Santos',
    role: 'Commis de Cuisine',
    company: 'Royal Caribbean International',
    quote: 'Bluechef Global Academy gave me the exact hands-on galley experience needed to pass my cruise line practical trade test on the very first try! Now I travel the world while earning in USD.',
    avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=250&q=80',
    branch: 'Tagum Branch Graduate'
  },
  {
    id: 2,
    name: 'Jessica Mae Rodriguez',
    role: 'Assistant Stateroom Attendant',
    company: 'Celebrity Cruises',
    quote: 'The instructors at BGA are true cruise industry veterans. They taught us not just skills, but the discipline, confidence, and English communication required for international guests.',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
    branch: 'Butuan Branch Graduate'
  },
  {
    id: 3,
    name: 'Christian Dave Perez',
    role: 'Bar Waiter',
    company: 'Carnival Cruise Line',
    quote: 'Attending the FREE orientation at Pagadian branch changed my life. Within 5 months of training, I got hired by Carnival. Thank you Bluechef family!',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    branch: 'Pagadian Branch Graduate'
  },
  {
    id: 4,
    name: 'Elena Rose Flores',
    role: 'Buffet Attendant',
    company: 'MSC Cruises',
    quote: 'From zero knowledge to working on a luxury liner in Europe! BGA Bacolod branch guided me step-by-step from training to agency interviews.',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
    branch: 'Bacolod Branch Graduate'
  }
];

export const FAQS = [
  {
    id: 'faq-1',
    question: 'What are the basic admission requirements to enroll in BGA?',
    answer: 'Basic requirements include: High School Diploma or ALS Certificate, PSA Birth Certificate, Barangay Clearance, 2x2 ID photos, and a strong passion to pursue an international cruise ship career. Age requirement is generally 18 to 35 years old.'
  },
  {
    id: 'faq-2',
    question: 'Is the Saturday Orientation really FREE?',
    answer: 'Yes! Our Career Guidance Orientation is 100% free with no hidden obligation. It covers cruise line salary expectations, hiring qualifications, step-by-step application procedures, and academy scholarship options.'
  },
  {
    id: 'faq-3',
    question: 'Does Bluechef Global Academy offer job placement assistance?',
    answer: 'Yes. BGA has strategic partnerships and direct endorsements with leading POEA/DMW licensed manning agencies that recruit for Royal Caribbean, Carnival, Celebrity Cruises, MSC, Princess Cruises, and NCL.'
  },
  {
    id: 'faq-4',
    question: 'Are BGA training programs TESDA accredited?',
    answer: 'Yes! All core training modules align with TESDA regulations and maritime industry STCW / MLC 2006 international standard guidelines.'
  },
  {
    id: 'faq-5',
    question: 'Can I pay the training tuition in installment plans?',
    answer: 'Absolutely. We offer flexible zero-interest installment plans, early bird discounts, and partial sponsorship options to ensure financial ease for all aspiring seafarers.'
  },
  {
    id: 'faq-6',
    question: 'How long does it take from enrollment to embarking on a cruise ship?',
    answer: 'Training duration ranges from 1.5 to 3 months depending on the program. After completion and practical assessment, processing with manning agencies for medical, visa, and deployment usually takes 3 to 6 months.'
  }
];

export const PARTNER_CRUISE_LINES = [
  'Royal Caribbean International',
  'Carnival Cruise Line',
  'Celebrity Cruises',
  'MSC Cruises',
  'Princess Cruises',
  'Norwegian Cruise Line',
  'Costa Cruises',
  'Disney Cruise Line'
];
