import { INITIAL_ORIENTATIONS, INITIAL_RESERVATIONS } from './orientationData';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

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
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data?.session) {
          return {
            token: data.session.access_token,
            admin: { email: data.user.email, id: data.user.id }
          };
        }
      } catch (err) {
        console.warn('Supabase Auth error, falling back to API:', err.message);
      }
    }

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

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('orientations').select('*').order('date', { ascending: true });
        if (branch && branch !== 'All') query = query.eq('branch', branch);
        if (status && status !== 'All') query = query.eq('status', status);
        if (search) query = query.ilike('title', `%${search}%`);

        const { data, error } = await query;
        if (!error && data) {
          return data.map((o) => ({
            ...o,
            remaining_slots: Math.max(0, (o.capacity || 50) - (o.reserved || 0))
          }));
        }
      } catch (err) {
        console.warn('Supabase Orientations error:', err.message);
      }
    }

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
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('orientations').insert([{
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
        }]).select();

        if (!error && data) {
          return { message: 'Orientation created successfully', id: data[0].id, orientation: data[0] };
        }
      } catch (err) {
        console.warn('Supabase Create Orientation error:', err.message);
      }
    }

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
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('orientations').update(eventData).eq('id', id).select();
        if (!error && data) {
          return { message: 'Orientation updated successfully', orientation: data[0] };
        }
      } catch (err) {
        console.warn('Supabase Update Orientation error:', err.message);
      }
    }

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
    const index = items.findIndex((o) => String(o.id) === String(id));
    if (index !== -1) {
      items[index] = { ...items[index], ...eventData };
      saveLocalOrientations(items);
      return { message: 'Orientation updated successfully', orientation: items[index] };
    }
    throw new Error('Orientation event not found.');
  },

  // 5. Delete Orientation Event
  async deleteOrientation(id, token) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('orientations').delete().eq('id', id);
        if (!error) return { message: 'Orientation deleted successfully' };
      } catch (err) {
        console.warn('Supabase Delete Orientation error:', err.message);
      }
    }

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

    let items = getLocalOrientations();
    items = items.filter((o) => String(o.id) !== String(id));
    saveLocalOrientations(items);

    let reservations = getLocalReservations();
    reservations = reservations.filter((r) => String(r.orientation_id) !== String(id));
    saveLocalReservations(reservations);

    return { message: 'Orientation deleted successfully' };
  },

  // 6. Submit Reservation
  async createReservation(reservationData) {
    if (isSupabaseConfigured && supabase) {
      try {
        const refNumber = 'BGA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data, error } = await supabase.from('reservations').insert([{
          orientation_id: reservationData.orientation_id,
          reference_number: refNumber,
          full_name: reservationData.full_name,
          phone: reservationData.phone,
          email: reservationData.email,
          address: reservationData.address,
          city: reservationData.city,
          province: reservationData.province,
          notes: reservationData.notes || '',
          status: 'Pending'
        }]).select();

        if (!error && data) {
          // Increment reserved count
          const { data: oData } = await supabase.from('orientations').select('reserved').eq('id', reservationData.orientation_id).single();
          if (oData) {
            await supabase.from('orientations').update({ reserved: (oData.reserved || 0) + 1 }).eq('id', reservationData.orientation_id);
          }
          return {
            message: 'Reservation submitted successfully',
            reference_number: data[0].reference_number,
            reservation: data[0]
          };
        }
      } catch (err) {
        console.warn('Supabase Create Reservation error:', err.message);
      }
    }

    try {
      const res = await fetch(`${BASE_URL}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservationData)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Fallback
    }

    const oItems = getLocalOrientations();
    const targetOrientation = oItems.find((o) => String(o.id) === String(reservationData.orientation_id));
    if (!targetOrientation) {
      throw new Error('Selected orientation event does not exist.');
    }
    if (targetOrientation.reserved >= targetOrientation.capacity) {
      throw new Error('Selected orientation event is fully booked.');
    }

    targetOrientation.reserved += 1;
    saveLocalOrientations(oItems);

    const rItems = getLocalReservations();
    const newId = rItems.length > 0 ? Math.max(...rItems.map((r) => r.id)) + 1 : 101;
    const refNumber = 'BGA-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const newReservation = {
      id: newId,
      orientation_id: targetOrientation.id,
      reference_number: refNumber,
      full_name: reservationData.full_name,
      phone: reservationData.phone,
      email: reservationData.email,
      address: reservationData.address,
      city: reservationData.city,
      province: reservationData.province,
      notes: reservationData.notes || '',
      status: 'Pending',
      created_at: new Date().toISOString()
    };

    rItems.unshift(newReservation);
    saveLocalReservations(rItems);

    return {
      message: 'Reservation created successfully',
      reference_number: newReservation.reference_number,
      reservation: newReservation
    };
  },

  async submitReservation(reservationData) {
    return this.createReservation(reservationData);
  },

  // 7. Get Reservations (Admin)
  async getReservations(token, filters = {}) {
    const { branch, status, search, orientation_id } = filters;

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('reservations').select('*').order('created_at', { ascending: false });
        if (status && status !== 'All') query = query.eq('status', status);
        if (orientation_id && orientation_id !== 'All') query = query.eq('orientation_id', orientation_id);

        const { data, error } = await query;
        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('Supabase Get Reservations error:', err.message);
      }
    }

    try {
      const params = new URLSearchParams();
      if (branch) params.append('branch', branch);
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      if (orientation_id) params.append('orientation_id', orientation_id);

      const res = await fetch(`${BASE_URL}/reservations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Fallback
    }

    let items = getLocalReservations();
    const orientations = getLocalOrientations();

    items = items.map((r) => {
      const o = orientations.find((ori) => String(ori.id) === String(r.orientation_id));
      return {
        ...r,
        orientation_title: o ? o.title : 'Orientation Event',
        orientation_branch: o ? o.branch : 'Main Branch',
        orientation_date: o ? o.date : '',
        orientation_time: o ? `${o.start_time} - ${o.end_time}` : ''
      };
    });

    if (branch && branch !== 'All') {
      items = items.filter((r) => r.orientation_branch && r.orientation_branch.toLowerCase() === branch.toLowerCase());
    }
    if (status && status !== 'All') {
      items = items.filter((r) => r.status.toLowerCase() === status.toLowerCase());
    }
    if (orientation_id && orientation_id !== 'All') {
      items = items.filter((r) => String(r.orientation_id) === String(orientation_id));
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.reference_number.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q)
      );
    }
    return items;
  },

  // 8. Update Reservation Status
  async updateReservationStatus(id, newStatus, token) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('reservations').update({ status: newStatus }).eq('id', id).select();
        if (!error && data) {
          return { message: 'Reservation updated successfully', reservation: data[0] };
        }
      } catch (err) {
        console.warn('Supabase Update Reservation error:', err.message);
      }
    }

    try {
      const res = await fetch(`${BASE_URL}/reservations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Fallback
    }

    const items = getLocalReservations();
    const target = items.find((r) => String(r.id) === String(id));
    if (!target) throw new Error('Reservation not found.');

    target.status = newStatus;
    saveLocalReservations(items);
    return { message: 'Reservation updated successfully', reservation: target };
  }
};
