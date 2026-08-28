import { INITIAL_ORIENTATIONS, INITIAL_RESERVATIONS } from './orientationData';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const IS_DEVELOPMENT = import.meta.env.DEV;

function todayLocalISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().split('T')[0];
}

function isBookableOrientation(orientation) {
  return (
    ['Open', 'Published'].includes(orientation.status) &&
    orientation.date >= todayLocalISO() &&
    Number(orientation.reserved || 0) < Number(orientation.capacity || 0)
  );
}

function normalizeConfirmation(row) {
  if (!row) return null;
  return {
    reference_number: row.reference_number,
    full_name: row.full_name,
    status: row.reservation_status || row.status || 'Pending',
    orientation_title: row.orientation_title,
    orientation_branch: row.orientation_branch,
    orientation_venue: row.orientation_venue,
    orientation_date: row.orientation_date,
    orientation_start_time: row.orientation_start_time,
    orientation_end_time: row.orientation_end_time,
    submitted_at: row.submitted_at || row.created_at
  };
}

function productionServiceError(action, error) {
  console.error(`Supabase ${action} error:`, error);
  return new Error('The reservation service is temporarily unavailable. Please try again shortly.');
}

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
        if (!IS_DEVELOPMENT) throw error || new Error('Invalid email or password.');
      } catch (err) {
        if (!IS_DEVELOPMENT) throw new Error('Invalid email or password.');
        console.warn('Supabase Auth error, using development API fallback:', err.message);
      }
    } else if (!IS_DEVELOPMENT) {
      throw new Error('Admin authentication is not configured.');
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
        if (error) throw error;
        if (data) {
          return data.map((o) => ({
            ...o,
            remaining_slots: Math.max(0, (o.capacity || 50) - (o.reserved || 0))
          }));
        }
      } catch (err) {
        if (!IS_DEVELOPMENT) throw productionServiceError('orientations', err);
        console.warn('Supabase Orientations error, using development fallback:', err.message);
      }
    } else if (!IS_DEVELOPMENT) {
      throw new Error('The orientation service is not configured.');
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

  // Public schedule listing. Production never falls back to a disconnected store.
  async getPublicOrientations(filters = {}) {
    const { branch, orientationId } = filters;

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('orientations')
          .select('*')
          .in('status', ['Open', 'Published'])
          .gte('date', todayLocalISO())
          .order('date', { ascending: true })
          .order('start_time', { ascending: true });

        if (branch && branch !== 'All') query = query.eq('branch', branch);
        if (orientationId) query = query.eq('id', orientationId);

        const { data, error } = await query;
        if (error) throw error;

        return (data || [])
          .filter(isBookableOrientation)
          .map((orientation) => ({
            ...orientation,
            remaining_slots: Math.max(0, Number(orientation.capacity) - Number(orientation.reserved || 0))
          }));
      } catch (err) {
        if (!IS_DEVELOPMENT) throw productionServiceError('public orientations', err);
        console.warn('Supabase public orientations error, using development fallback:', err.message);
      }
    } else if (!IS_DEVELOPMENT) {
      throw new Error('The reservation service is not configured. Please contact BGA Admissions.');
    }

    try {
      const params = new URLSearchParams();
      if (branch && branch !== 'All') params.set('branch', branch);
      if (orientationId) params.set('orientation_id', orientationId);
      const res = await fetch(`${BASE_URL}/orientations/public?${params.toString()}`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('Development API unavailable, using browser demo data:', err.message);
    }

    return getLocalOrientations()
      .filter(isBookableOrientation)
      .filter((orientation) => !branch || branch === 'All' || orientation.branch.toLowerCase() === branch.toLowerCase())
      .filter((orientation) => !orientationId || String(orientation.id) === String(orientationId))
      .map((orientation) => ({
        ...orientation,
        remaining_slots: Math.max(0, Number(orientation.capacity) - Number(orientation.reserved || 0))
      }));
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
        if (!IS_DEVELOPMENT) throw new Error(err.message || 'Unable to create the orientation.');
        console.warn('Supabase create orientation error, using development fallback:', err.message);
      }
    } else if (!IS_DEVELOPMENT) {
      throw new Error('The orientation service is not configured.');
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
        if (!IS_DEVELOPMENT) throw new Error(err.message || 'Unable to update the orientation.');
        console.warn('Supabase update orientation error, using development fallback:', err.message);
      }
    } else if (!IS_DEVELOPMENT) {
      throw new Error('The orientation service is not configured.');
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
        if (!IS_DEVELOPMENT) throw new Error(err.message || 'Unable to delete the orientation.');
        console.warn('Supabase delete orientation error, using development fallback:', err.message);
      }
    } else if (!IS_DEVELOPMENT) {
      throw new Error('The orientation service is not configured.');
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
        const { data, error } = await supabase.rpc('book_orientation', {
          p_orientation_id: reservationData.orientation_id,
          p_full_name: reservationData.full_name,
          p_phone: reservationData.phone,
          p_email: reservationData.email,
          p_address: reservationData.address,
          p_city: reservationData.city,
          p_province: reservationData.province,
          p_notes: reservationData.notes || ''
        });

        if (error) throw error;
        const confirmation = normalizeConfirmation(data?.[0]);
        if (!confirmation) throw new Error('No confirmation was returned.');

        return {
          message: 'Reservation submitted successfully',
          reference_number: confirmation.reference_number,
          confirmation
        };
      } catch (err) {
        if (!IS_DEVELOPMENT) {
          if (err?.code === '23505' || /already exists/i.test(err?.message || '')) {
            throw new Error('A reservation already exists for this schedule using this email or phone number.');
          }
          if (/no longer available|unavailable|fully booked/i.test(err?.message || '')) {
            throw new Error('Selected orientation event is no longer available. Please choose another schedule.');
          }
          throw productionServiceError('booking', err);
        }
        console.warn('Supabase booking error, using development fallback:', err.message);
      }
    } else if (!IS_DEVELOPMENT) {
      throw new Error('The reservation service is not configured. Please contact BGA Admissions.');
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
    if (!isBookableOrientation(targetOrientation)) {
      throw new Error('Selected orientation event is no longer available.');
    }

    const rItems = getLocalReservations();
    const duplicate = rItems.some(
      (reservation) =>
        String(reservation.orientation_id) === String(reservationData.orientation_id) &&
        reservation.status !== 'Cancelled' &&
        (
          reservation.email.trim().toLowerCase() === reservationData.email.trim().toLowerCase() ||
          reservation.phone.replace(/\D/g, '') === reservationData.phone.replace(/\D/g, '')
        )
    );
    if (duplicate) {
      throw new Error('A reservation already exists for this schedule using this email or phone number.');
    }

    targetOrientation.reserved += 1;
    if (targetOrientation.reserved >= targetOrientation.capacity) targetOrientation.status = 'Fully Booked';
    saveLocalOrientations(oItems);

    const newId = rItems.length > 0 ? Math.max(...rItems.map((r) => r.id)) + 1 : 101;
    const randomPart = crypto.getRandomValues(new Uint32Array(2));
    const refNumber = `BGA-${new Date().getFullYear()}-${Array.from(randomPart, (value) => value.toString(36)).join('').slice(0, 10).toUpperCase()}`;

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
      confirmation: normalizeConfirmation({
        ...newReservation,
        reservation_status: newReservation.status,
        orientation_title: targetOrientation.title,
        orientation_branch: targetOrientation.branch,
        orientation_venue: targetOrientation.venue,
        orientation_date: targetOrientation.date,
        orientation_start_time: targetOrientation.start_time,
        orientation_end_time: targetOrientation.end_time,
        submitted_at: newReservation.created_at
      })
    };
  },

  async submitReservation(reservationData) {
    return this.createReservation(reservationData);
  },

  async lookupReservationConfirmation(referenceNumber, phone) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('lookup_reservation_confirmation', {
          p_reference_number: referenceNumber,
          p_phone: phone
        });
        if (error) throw error;
        return normalizeConfirmation(data?.[0]);
      } catch (err) {
        if (!IS_DEVELOPMENT) throw productionServiceError('confirmation lookup', err);
        console.warn('Supabase confirmation lookup error, using development fallback:', err.message);
      }
    } else if (!IS_DEVELOPMENT) {
      throw new Error('The reservation service is not configured. Please contact BGA Admissions.');
    }

    try {
      const res = await fetch(`${BASE_URL}/reservations/confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_number: referenceNumber, phone })
      });
      if (res.ok) return normalizeConfirmation(await res.json());
      if (res.status === 404) return null;
    } catch (err) {
      console.warn('Development confirmation API unavailable, using browser demo data:', err.message);
    }

    const reservation = getLocalReservations().find(
      (item) =>
        item.reference_number.toLowerCase() === referenceNumber.trim().toLowerCase() &&
        item.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')
    );
    if (!reservation) return null;

    const orientation = getLocalOrientations().find((item) => String(item.id) === String(reservation.orientation_id));
    return normalizeConfirmation({
      ...reservation,
      reservation_status: reservation.status,
      orientation_title: orientation?.title,
      orientation_branch: orientation?.branch,
      orientation_venue: orientation?.venue,
      orientation_date: orientation?.date,
      orientation_start_time: orientation?.start_time,
      orientation_end_time: orientation?.end_time,
      submitted_at: reservation.created_at
    });
  },

  // 7. Get Reservations (Admin)
  async getReservations(token, filters = {}) {
    const { branch, status, search, orientation_id } = filters;

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('reservations')
          .select('*, orientations!inner(title, branch, venue, date, start_time, end_time)')
          .order('created_at', { ascending: false });
        if (status && status !== 'All') query = query.eq('status', status);
        if (orientation_id && orientation_id !== 'All') query = query.eq('orientation_id', orientation_id);
        if (branch && branch !== 'All') query = query.eq('orientations.branch', branch);
        if (search) {
          query = query.or(`full_name.ilike.%${search}%,reference_number.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (data) {
          return data.map((reservation) => ({
            ...reservation,
            orientation_title: reservation.orientations?.title,
            orientation_branch: reservation.orientations?.branch,
            orientation_venue: reservation.orientations?.venue,
            orientation_date: reservation.orientations?.date,
            orientation_time: reservation.orientations
              ? `${reservation.orientations.start_time} - ${reservation.orientations.end_time}`
              : ''
          }));
        }
      } catch (err) {
        if (!IS_DEVELOPMENT) throw productionServiceError('admin reservations', err);
        console.warn('Supabase admin reservations error, using development fallback:', err.message);
      }
    } else if (!IS_DEVELOPMENT) {
      throw new Error('The reservation service is not configured.');
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
        const { error } = await supabase.rpc('set_reservation_status', {
          p_reservation_id: id,
          p_status: newStatus
        });
        if (error) throw error;
        return { message: 'Reservation updated successfully' };
      } catch (err) {
        if (!IS_DEVELOPMENT) throw new Error(err.message || 'Unable to update the reservation status.');
        console.warn('Supabase reservation status error, using development fallback:', err.message);
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

    const previousStatus = target.status;
    const orientations = getLocalOrientations();
    const orientation = orientations.find((item) => String(item.id) === String(target.orientation_id));
    if (orientation && previousStatus === 'Cancelled' && newStatus !== 'Cancelled') {
      if (Number(orientation.reserved) >= Number(orientation.capacity)) {
        throw new Error('The orientation is already fully booked.');
      }
      orientation.reserved += 1;
      if (orientation.reserved >= orientation.capacity) orientation.status = 'Fully Booked';
      saveLocalOrientations(orientations);
    } else if (orientation && previousStatus !== 'Cancelled' && newStatus === 'Cancelled') {
      orientation.reserved = Math.max(0, orientation.reserved - 1);
      if (orientation.status === 'Fully Booked') orientation.status = 'Open';
      saveLocalOrientations(orientations);
    }

    target.status = newStatus;
    saveLocalReservations(items);
    return { message: 'Reservation updated successfully', reservation: target };
  },

  async updateOrientationStatus(id, newStatus, token) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('orientations')
          .update({ status: newStatus })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return { message: `Orientation status changed to ${newStatus}`, orientation: data };
      } catch (err) {
        if (!IS_DEVELOPMENT) throw new Error(err.message || 'Unable to update the orientation status.');
        console.warn('Supabase orientation status error, using development fallback:', err.message);
      }
    }

    try {
      const res = await fetch(`${BASE_URL}/orientations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      if (!IS_DEVELOPMENT) throw err;
    }

    if (!IS_DEVELOPMENT) throw new Error('Unable to update the orientation status.');
    const items = getLocalOrientations();
    const target = items.find((item) => String(item.id) === String(id));
    if (!target) throw new Error('Orientation event not found.');
    target.status = newStatus;
    saveLocalOrientations(items);
    return { message: `Orientation status changed to ${newStatus}`, orientation: target };
  },

  async duplicateOrientation(id, token) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: source, error: sourceError } = await supabase
          .from('orientations')
          .select('*')
          .eq('id', id)
          .single();
        if (sourceError) throw sourceError;

        const { id: ignoredId, created_at: ignoredCreatedAt, updated_at: ignoredUpdatedAt, ...copy } = source;
        void ignoredId;
        void ignoredCreatedAt;
        void ignoredUpdatedAt;

        const { data, error } = await supabase
          .from('orientations')
          .insert([{ ...copy, title: `${source.title} (Copy)`, reserved: 0, status: 'Draft' }])
          .select()
          .single();
        if (error) throw error;
        return { message: 'Event duplicated successfully', id: data.id, orientation: data };
      } catch (err) {
        if (!IS_DEVELOPMENT) throw new Error(err.message || 'Unable to duplicate the orientation.');
        console.warn('Supabase duplicate orientation error, using development fallback:', err.message);
      }
    }

    try {
      const res = await fetch(`${BASE_URL}/orientations/${id}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      if (!IS_DEVELOPMENT) throw err;
    }

    if (!IS_DEVELOPMENT) throw new Error('Unable to duplicate the orientation.');
    const items = getLocalOrientations();
    const source = items.find((item) => String(item.id) === String(id));
    if (!source) throw new Error('Orientation event not found.');
    const newId = items.length ? Math.max(...items.map((item) => Number(item.id))) + 1 : 1;
    const duplicate = { ...source, id: newId, title: `${source.title} (Copy)`, reserved: 0, status: 'Draft' };
    items.unshift(duplicate);
    saveLocalOrientations(items);
    return { message: 'Event duplicated successfully', id: newId, orientation: duplicate };
  }
};
