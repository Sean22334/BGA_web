import { supabase } from '../lib/supabaseClient';
import { createApi } from './createApi.js';

export const api = createApi({
  supabase,
  development: import.meta.env.DEV,
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  getToken: () => localStorage.getItem('bga_admin_token') || ''
});
