import { INITIAL_ORIENTATIONS, INITIAL_RESERVATIONS } from './orientationData';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Helper to manage localStorage mock store
function getLocalOrientations() {
  const stored = localStorage.getItem('bga_orientations_store');
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { }
  }
  localStorage.setItem('bga_orientations_store', JSON.stringify(INITIAL_ORIENTATIONS));
  return INITIAL_ORIENTATIONS;
}

function saveLocalOrientations(data) {
  localStorage.setItem('bga_orientations_store', JSON.stringify(data));
}

function getLocalReservations() {
  const stored = localStorage.getItem('bga_reservations_store');
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { }
  }
  localStorage.setItem('bga_reservations_store', JSON.stringify(INITIAL_RESERVATIONS));
  return INITIAL_RESERVATIONS;
}

function saveLocalReservations(data) {
  localStorage.setItem('bga_reservations_store', JSON.stringify(data));
}

// Unified API Service
export const api = {
  // 1. Admin Login
  async loginAdmin(email, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (res.ok) {
      return await res.json();
    }

    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Invalid email or password.');
  },

  // 2. Fetch Orientations
  async getOrientations(filters = {}) {
    const { branch, status, search } = filters;
    try {
      const params = new URLSearchParams();
      if (branch) params.append('branch', branch);
      if (status) params.append('status', status);
      if (search) params.append('search', search);

      const res = await fetch(`${BASE_URL}/orientations?${params.toString()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Fallback
    }

    let items = getLocalOrientations().map((o) => ({
      ...o,
      remaining_slots: Math.max(0, o.capacity - o.reserved)
    }));

    if (branch && branch !== 'All') {
      items = items.filter((o) => o.branch.toLowerCase() === branch.toLowerCase());
    }
    if (status && status !== 'All') {
      items = items.filter((o) => o.status.toLowerCase() === status.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((o) => o.title.toLowerCase().includes(q) || o.venue.toLowerCase().includes(q));
    }
    return items;
  },

  // 3. Create Orientation Event
  async createOrientation(eventData, token) {
    try {
      const res = await fetch(`${BASE_URL}/orientations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Fallback
    }

    const items = getLocalOrientations();
    const newId = items.length > 0 ? Math.max(...items.map((o) => o.id)) + 1 : 1;
    const newEvent = {
      id: newId,
      title: eventData.title,
      branch: eventData.branch,
      venue: eventData.venue,
      description: eventData.description || '',
      date: eventData.date,
      start_time: eventData.start_time || '09:00 AM',
      end_time: eventData.end_time || '12:00 PM',
      capacity: parseInt(eventData.capacity),
      reserved: 0,
      status: eventData.status || 'Published'
    };
    items.unshift(newEvent);
    saveLocalOrientations(items);
    return { message: 'Orientation created successfully', id: newId, orientation: newEvent };
  },

  // 4. Update Orientation Event
  async updateOrientation(id, eventData, token) {
    try {
      const res = await fetch(`${BASE_URL}/orientations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Fallback
    }

    const items = getLocalOrientations();
    const idx = items.findIndex((o) => o.id === parseInt(id));
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...eventData, capacity: parseInt(eventData.capacity || items[idx].capacity) };
      saveLocalOrientations(items);
    }
    return { message: 'Orientation updated successfully' };
  },

  // 5. Change Orientation Status
  async updateOrientationStatus(id, status, token) {
    try {
      const res = await fetch(`${BASE_URL}/orientations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Fallback
    }

    const items = getLocalOrientations();
    const event = items.find((o) => o.id === parseInt(id));
    if (event) {
      event.status = status;
      saveLocalOrientations(items);
    }
    return { message: `Status updated to ${status}` };
  },

  // 6. Duplicate Orientation
  async duplicateOrientation(id, token) {
    try {
      const res = await fetch(`${BASE_URL}/orientations/${id}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Fallback
    }

    const items = getLocalOrientations();
    const orig = items.find((o) => o.id === parseInt(id));
    if (orig) {
      const newId = items.length > 0 ? Math.max(...items.map((o) => o.id)) + 1 : 1;
      const dup = { ...orig, id: newId, title: `${orig.title} (Copy)`, reserved: 0, status: 'Draft' };
      items.unshift(dup);
      saveLocalOrientations(items);
    }
    return { message: 'Event duplicated successfully' };
  },

  // 7. Delete Orientation
  async deleteOrientation(id, token) {
    try {
      const res = await fetch(`${BASE_URL}/orientations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Fallback
    }

    let items = getLocalOrientations().filter((o) => o.id !== parseInt(id));
    saveLocalOrientations(items);
    let resList = getLocalReservations().filter((r) => r.orientation_id !== parseInt(id));
    saveLocalReservations(resList);
    return { message: 'Orientation deleted' };
  },

  // 8. Submit Public Reservation
  async submitReservation(reservationData) {
    try {
      const res = await fetch(`${BASE_URL}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservationData)
      });
      if (res.ok) {
        return await res.json();
      }

      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to complete reservation.');
    } catch (err) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('JSON')) {
        throw err;
      }
      // Fallback if backend server is completely offline
    }

    const items = getLocalOrientations();
    const event = items.find((o) => o.id === parseInt(reservationData.orientation_id));
    if (!event) throw new Error('Selected orientation event not found.');

    const remaining = event.capacity - event.reserved;
    if (remaining <= 0 || event.status === 'Fully Booked' || event.status === 'Closed') {
      throw new Error('Sorry! This orientation session is FULLY BOOKED or closed.');
    }

    // Check if applicant has already submitted a reservation for this orientation (by email or phone)
    const resList = getLocalReservations();
    const existingDuplicate = resList.find(
      (r) =>
        (r.email.toLowerCase() === reservationData.email.toLowerCase() || r.phone === reservationData.phone) &&
        r.orientation_id === parseInt(reservationData.orientation_id) &&
        r.status !== 'Cancelled'
    );

    if (existingDuplicate) {
      throw new Error(
        'You have already submitted a reservation for this orientation session using this email address or phone number.'
      );
    }

    // Process reservation
    event.reserved += 1;
    if (event.reserved >= event.capacity) {
      event.status = 'Fully Booked';
    }
    saveLocalOrientations(items);

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const refNumber = `BGA-2026-${randomCode}`;

    const newResId = resList.length > 0 ? Math.max(...resList.map((r) => r.id)) + 1 : 1;

    const newRes = {
      id: newResId,
      orientation_id: parseInt(reservationData.orientation_id),
      reference_number: refNumber,
      full_name: reservationData.full_name,
      phone: reservationData.phone,
      email: reservationData.email,
      address: reservationData.address,
      city: reservationData.city,
      province: reservationData.province,
      notes: reservationData.notes || '',
      status: 'Pending',
      created_at: new Date().toLocaleString()
    };
    resList.unshift(newRes);
    saveLocalReservations(resList);

    // Broadcast synchronization trigger for multi-tab real-time updates
    try {
      window.dispatchEvent(new CustomEvent('bga_reservation_event', { detail: { type: 'RESERVATION_CREATED', data: newRes } }));
      localStorage.setItem('bga_last_update_trigger', Date.now().toString());
    } catch (e) {}

    return {
      message: 'Reservation submitted successfully',
      reference_number: refNumber,
      reservation_id: newResId,
      orientation: {
        id: event.id,
        title: event.title,
        branch: event.branch,
        venue: event.venue,
        date: event.date,
        start_time: event.start_time
      }
    };
  },

  // 9. Get Reservations (Admin List with Search & Filter)
  async getReservations(token, filters = {}) {
    const { orientation_id, branch, status, search } = filters;
    try {
      const params = new URLSearchParams();
      if (orientation_id) params.append('orientation_id', orientation_id);
      if (branch) params.append('branch', branch);
      if (status) params.append('status', status);
      if (search) params.append('search', search);

      const res = await fetch(`${BASE_URL}/reservations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Fallback
    }

    const items = getLocalOrientations();
    let resList = getLocalReservations().map((r) => {
      const o = items.find((orig) => orig.id === r.orientation_id) || {};
      return {
        ...r,
        orientation_title: o.title || 'FREE Career Orientation',
        orientation_branch: o.branch || 'Tagum',
        orientation_venue: o.venue || 'BGA Training Center',
        orientation_date: o.date || '2026-08-01',
        orientation_time: o.start_time || '09:00 AM'
      };
    });

    if (orientation_id && orientation_id !== 'All') {
      resList = resList.filter((r) => r.orientation_id === parseInt(orientation_id));
    }
    if (branch && branch !== 'All') {
      resList = resList.filter((r) => r.orientation_branch.toLowerCase() === branch.toLowerCase());
    }
    if (status && status !== 'All') {
      resList = resList.filter((r) => r.status.toLowerCase() === status.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      resList = resList.filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          r.reference_number.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          r.email.toLowerCase().includes(q)
      );
    }
    return resList;
  },

  // 10. Update Reservation Status (Confirm / Cancel)
  async updateReservationStatus(id, status, token) {
    try {
      const res = await fetch(`${BASE_URL}/reservations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Fallback
    }

    const resList = getLocalReservations();
    const r = resList.find((resItem) => resItem.id === parseInt(id));
    if (!r) throw new Error('Reservation not found');

    const prevStatus = r.status;
    r.status = status;
    saveLocalReservations(resList);

    const items = getLocalOrientations();
    const event = items.find((o) => o.id === r.orientation_id);
    if (event) {
      if (prevStatus !== 'Cancelled' && status === 'Cancelled') {
        event.reserved = Math.max(0, event.reserved - 1);
        if (event.status === 'Fully Booked') event.status = 'Open';
      } else if (prevStatus === 'Cancelled' && status !== 'Cancelled') {
        event.reserved += 1;
        if (event.reserved >= event.capacity) event.status = 'Fully Booked';
      }
      saveLocalOrientations(items);
    }

    return { message: `Reservation status updated to ${status}` };
  }
};
