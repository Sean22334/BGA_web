// Initial Orientation & Reservation Mock Data Service
export const INITIAL_ORIENTATIONS = [
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

export const INITIAL_RESERVATIONS = [
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
