import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { createCmsApi } from './createCmsApi.js';

const cms = createCmsApi({
  supabase: isSupabaseConfigured ? supabase : null,
  development: import.meta.env.DEV,
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  getToken: () => localStorage.getItem('bga_admin_token') || ''
});

export const { getPublicContent, getAdminCMSContent, updateSiteSettings, saveCollectionItem, deleteCollectionItem, uploadImage } = cms;
