import { isBookableOrientation, remainingSlots, todayInManila } from '../../shared/reservationRules.js';

const unavailable = () => new Error('The admissions service is temporarily unavailable. Please try again shortly.');

export function normalizeConfirmation(row) {
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

function orientationPayload(value) {
  return Object.fromEntries([
    'title', 'branch', 'venue', 'description', 'date', 'start_time', 'end_time', 'capacity', 'status'
  ].filter((key) => value[key] !== undefined).map((key) => [key, key === 'capacity' && value[key] !== null ? Number(value[key]) : value[key]]));
}

function withRemaining(orientation) {
  return { ...orientation, remaining_slots: remainingSlots(orientation) };
}

function queryString(filters) {
  return new URLSearchParams(Object.entries(filters).filter(([, value]) => value != null && value !== '' && value !== 'All')).toString();
}

function serviceError(error) {
  if (error?.code === '23505') return new Error('A reservation already exists for this schedule using this email or phone number.');
  if (['P0001', 'P0002', '22023', '23514'].includes(error?.code)) return new Error(error.message);
  if (error?.code === '42501') return new Error('Administrator access is required. Please sign in again.');
  return unavailable();
}

// A configured Supabase client is authoritative, including during development.
// Development without Supabase uses Express, including its in-memory demo store.
// Failed operations never switch stores or record browser-local successes.
export function createApi({ supabase = null, development = false, baseUrl = '/api', fetchImpl = globalThis.fetch, getToken = () => '' } = {}) {
  async function remote(operation) {
    try {
      const result = await operation();
      if (result.error) throw result.error;
      return result.data;
    } catch (error) {
      throw serviceError(error);
    }
  }

  async function local(path, { method = 'GET', body, token, optional = false } = {}) {
    if (!development) throw unavailable();
    let response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
    } catch {
      throw unavailable();
    }
    if (optional && response.status === 404) return null;
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(response.status >= 500 ? unavailable().message : data?.error || 'Unable to complete this request.');
    return data;
  }

  const api = {
    async loginAdmin(email, password) {
      if (!supabase) return { ...await local('/auth/login', { method: 'POST', body: { email, password } }), provider: 'express' };
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data?.session) throw new Error('Invalid credentials');
        const membership = await supabase.from('admin_users').select('user_id').eq('user_id', data.user.id).maybeSingle();
        if (membership.error || !membership.data) {
          await supabase.auth.signOut();
          throw new Error('Administrator access required');
        }
        return { token: data.session.access_token, admin: { email: data.user.email, id: data.user.id }, provider: 'supabase' };
      } catch {
        throw new Error('Invalid email or password, or this account is not authorized for administration.');
      }
    },

    async getOrientations(filters = {}) {
      if (!supabase) return local(`/orientations?${queryString(filters)}`, { token: getToken() });
      const rows = await remote(() => {
        let query = supabase.from('orientations').select('*').order('date', { ascending: true });
        if (filters.branch && filters.branch !== 'All') query = query.eq('branch', filters.branch);
        if (filters.status && filters.status !== 'All') query = query.eq('status', filters.status);
        if (filters.search) query = query.ilike('title', `%${filters.search}%`);
        return query;
      });
      return (rows || []).map(withRemaining);
    },

    async getPublicOrientations({ branch, orientationId } = {}) {
      if (!supabase) return local(`/orientations/public?${queryString({ branch, orientation_id: orientationId })}`);
      const rows = await remote(() => {
        let query = supabase.from('orientations').select('*').in('status', ['Open', 'Published'])
          .gte('date', todayInManila()).order('date', { ascending: true });
        if (branch && branch !== 'All') query = query.eq('branch', branch);
        if (orientationId) query = query.eq('id', orientationId);
        return query;
      });
      return (rows || []).filter((orientation) => isBookableOrientation(orientation)).map(withRemaining);
    },

    async createOrientation(eventData, token) {
      if (!supabase) return local('/orientations', { method: 'POST', body: eventData, token });
      const orientation = await remote(() => supabase.from('orientations')
        .insert([{ ...orientationPayload(eventData), reserved: 0 }]).select().single());
      if (!orientation) throw unavailable();
      return { message: 'Orientation created successfully', id: orientation.id, orientation };
    },

    async updateOrientation(id, eventData, token) {
      if (!supabase) return local(`/orientations/${id}`, { method: 'PUT', body: eventData, token });
      const orientation = await remote(() => supabase.from('orientations').update(orientationPayload(eventData)).eq('id', id).select().single());
      if (!orientation) throw unavailable();
      return { message: 'Orientation updated successfully', orientation };
    },

    async deleteOrientation(id, token) {
      if (!supabase) return local(`/orientations/${id}`, { method: 'DELETE', token });
      await remote(() => supabase.from('orientations').delete().eq('id', id).select('id').single());
      return { message: 'Orientation deleted successfully' };
    },

    async createReservation(payload) {
      if (!supabase) return local('/reservations', { method: 'POST', body: payload });
      const rows = await remote(() => supabase.rpc('book_orientation', {
        p_orientation_id: payload.orientation_id, p_full_name: payload.full_name,
        p_phone: payload.phone, p_email: payload.email, p_address: payload.address,
        p_city: payload.city, p_province: payload.province, p_notes: payload.notes || ''
      }));
      const confirmation = normalizeConfirmation(rows?.[0]);
      if (!confirmation?.reference_number) throw unavailable();
      return { message: 'Reservation submitted successfully', reference_number: confirmation.reference_number, confirmation };
    },

    submitReservation(payload) { return api.createReservation(payload); },

    async lookupReservationConfirmation(referenceNumber, phone) {
      if (!supabase) return normalizeConfirmation(await local('/reservations/confirmation', {
        method: 'POST', body: { reference_number: referenceNumber.trim(), phone: phone.trim() }, optional: true
      }));
      const rows = await remote(() => supabase.rpc('lookup_reservation_confirmation', {
        p_reference_number: referenceNumber.trim(), p_phone: phone.trim()
      }));
      return normalizeConfirmation(rows?.[0]);
    },

    async getReservations(token, filters = {}) {
      if (!supabase) return local(`/reservations?${queryString(filters)}`, { token });
      const rows = await remote(() => {
        let query = supabase.from('reservations').select('*, orientations!inner(title, branch, venue, date, start_time, end_time)').order('created_at', { ascending: false });
        if (filters.status && filters.status !== 'All') query = query.eq('status', filters.status);
        if (filters.orientation_id && filters.orientation_id !== 'All') query = query.eq('orientation_id', filters.orientation_id);
        if (filters.branch && filters.branch !== 'All') query = query.eq('orientations.branch', filters.branch);
        if (filters.search) {
          const pattern = `"%${filters.search.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}%"`;
          query = query.or(['full_name', 'reference_number', 'email', 'phone'].map((column) => `${column}.ilike.${pattern}`).join(','));
        }
        return query;
      });
      return (rows || []).map(({ orientations: orientation, ...reservation }) => ({
        ...reservation, orientation_title: orientation?.title, orientation_branch: orientation?.branch,
        orientation_venue: orientation?.venue, orientation_date: orientation?.date,
        orientation_time: orientation ? `${orientation.start_time} - ${orientation.end_time}` : ''
      }));
    },

    async updateReservationStatus(id, status, token) {
      if (!supabase) return local(`/reservations/${id}/status`, { method: 'PATCH', body: { status }, token });
      await remote(() => supabase.rpc('set_reservation_status', { p_reservation_id: id, p_status: status }));
      return { message: 'Reservation updated successfully' };
    },

    async updateOrientationStatus(id, status, token) {
      if (!supabase) return local(`/orientations/${id}/status`, { method: 'PATCH', body: { status }, token });
      return api.updateOrientation(id, { status }, token);
    },

    async duplicateOrientation(id, token) {
      if (!supabase) return local(`/orientations/${id}/duplicate`, { method: 'POST', token });
      const source = await remote(() => supabase.from('orientations').select('*').eq('id', id).single());
      if (!source) throw unavailable();
      return api.createOrientation({ ...orientationPayload(source), title: `${source.title} (Copy)`, status: 'Draft' }, token);
    }
  };
  return api;
}
