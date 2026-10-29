import { todayInManila } from './reservationRules.js';

// Fictional development fixtures only. Production data must be created by an admin.
export function createDevelopmentData(now = new Date()) {
  const firstSaturday = new Date(`${todayInManila(now)}T00:00:00Z`);
  firstSaturday.setUTCDate(firstSaturday.getUTCDate() + ((6 - firstSaturday.getUTCDay() + 7) % 7 || 7));
  const dateAt = (weeks) => new Date(firstSaturday.getTime() + weeks * 7 * 86400000).toISOString().slice(0, 10);
  const orientations = [
    { id: 1, branch: 'Tagum', venue: 'Bluechef Main Training Center, Tagum City', capacity: 60, reserved: 2, status: 'Open' },
    { id: 2, branch: 'Butuan', venue: 'BGA Butuan Culinary Lab, JC Aquino Ave', capacity: 2, reserved: 1, status: 'Published' },
    { id: 3, branch: 'Pagadian', venue: 'BGA Pagadian Training Hall, Rizal Ave', capacity: 1, reserved: 1, status: 'Fully Booked' },
    { id: 4, branch: 'Bacolod', venue: 'BGA Bacolod Campus, Lacson St.', capacity: 45, reserved: 0, status: 'Open' }
  ].map((item, index) => ({
    ...item,
    title: '[DEMO] FREE Saturday Cruise Career Orientation',
    description: 'Fictional development schedule for testing the reservation flow.',
    date: dateAt(index > 1 ? 1 : 0),
    start_time: index % 2 ? '01:30 PM' : '09:00 AM',
    end_time: index % 2 ? '04:30 PM' : '12:00 PM'
  }));
  const reservations = [
    { id: 1, orientation_id: 1, full_name: 'Alex Rivera', status: 'Confirmed' },
    { id: 2, orientation_id: 1, full_name: 'Jane Doe', status: 'Confirmed' },
    { id: 3, orientation_id: 2, full_name: 'John Smith', status: 'Confirmed' },
    { id: 4, orientation_id: 3, full_name: 'Sam Demo', status: 'Confirmed' }
  ].map((item) => ({
    ...item,
    reference_number: `BGA-DEMO-${String(item.id).padStart(10, '0')}`,
    phone: `0917000000${item.id}`,
    email: `demo${item.id}@example.com`,
    address: '123 Demo Street', city: 'Demo City', province: 'Demo Province',
    notes: 'Fictional development record.', created_at: new Date(now).toISOString()
  }));
  return { orientations, reservations };
}
