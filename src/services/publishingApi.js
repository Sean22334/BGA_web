import { supabase } from '../lib/supabaseClient';
import { createPublishingApi } from './createPublishingApi.js';

export const publishingApi = createPublishingApi({ supabase, development: import.meta.env.DEV, baseUrl: import.meta.env.VITE_API_URL || '/api', getToken: () => localStorage.getItem('bga_admin_token') || '' });
