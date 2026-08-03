import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const getToken = () => localStorage.getItem('bga_admin_token') || '';

/**
 * Helper to convert Base64 Data URL to Blob for Supabase Storage Upload
 */
function dataURItoBlob(dataURI) {
  if (!dataURI.startsWith('data:')) return null;
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

/**
 * Fetch Public Content for Website
 */
export async function getPublicContent() {
  if (isSupabaseConfigured && supabase) {
    try {
      const [
        { data: settingsRows },
        { data: programs },
        { data: branches },
        { data: gallery },
        { data: testimonials },
        { data: faqs }
      ] = await Promise.all([
        supabase.from('site_settings').select('*'),
        supabase.from('cms_programs').select('*').eq('is_published', true).order('display_order', { ascending: true }),
        supabase.from('cms_branches').select('*').eq('is_published', true).order('display_order', { ascending: true }),
        supabase.from('cms_gallery').select('*').eq('is_published', true).order('display_order', { ascending: true }),
        supabase.from('cms_testimonials').select('*').eq('is_published', true).order('display_order', { ascending: true }),
        supabase.from('cms_faqs').select('*').eq('is_published', true).order('display_order', { ascending: true })
      ]);

      const settingsObj = {};
      if (settingsRows) {
        settingsRows.forEach((row) => {
          settingsObj[row.setting_key] = row.setting_value;
        });
      }

      return {
        settings: settingsObj,
        programs: programs || [],
        branches: branches || [],
        gallery: gallery || [],
        testimonials: testimonials || [],
        faqs: faqs || []
      };
    } catch (err) {
      console.warn('⚠️ Supabase error, falling back to Express API:', err.message);
    }
  }

  try {
    const res = await fetch(`${API_BASE_URL}/content/public`);
    if (!res.ok) throw new Error('Failed to fetch public content');
    return await res.json();
  } catch (err) {
    console.warn('⚠️ Could not connect to CMS backend, using fallback dataset:', err.message);
    return null;
  }
}

/**
 * Fetch Admin CMS Content (Includes drafts)
 */
export async function getAdminCMSContent() {
  if (isSupabaseConfigured && supabase) {
    try {
      const [
        { data: settingsRows },
        { data: programs },
        { data: branches },
        { data: gallery },
        { data: testimonials },
        { data: faqs }
      ] = await Promise.all([
        supabase.from('site_settings').select('*'),
        supabase.from('cms_programs').select('*').order('display_order', { ascending: true }),
        supabase.from('cms_branches').select('*').order('display_order', { ascending: true }),
        supabase.from('cms_gallery').select('*').order('display_order', { ascending: true }),
        supabase.from('cms_testimonials').select('*').order('display_order', { ascending: true }),
        supabase.from('cms_faqs').select('*').order('display_order', { ascending: true })
      ]);

      const settingsObj = {};
      if (settingsRows) {
        settingsRows.forEach((row) => {
          settingsObj[row.setting_key] = row.setting_value;
        });
      }

      return {
        settings: settingsObj,
        programs: programs || [],
        branches: branches || [],
        gallery: gallery || [],
        testimonials: testimonials || [],
        faqs: faqs || []
      };
    } catch (err) {
      console.warn('⚠️ Supabase Admin error, falling back to Express API:', err.message);
    }
  }

  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/admin/content/all`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch admin CMS data');
  }
  return await res.json();
}

/**
 * Update Site Settings
 */
export async function updateSiteSettings(settingsObj) {
  if (isSupabaseConfigured && supabase) {
    const upsertRows = Object.entries(settingsObj).map(([key, val]) => ({
      setting_key: key,
      setting_value: String(val)
    }));

    const { error } = await supabase.from('site_settings').upsert(upsertRows, { onConflict: 'setting_key' });
    if (error) throw new Error(error.message);
    return { success: true, settings: settingsObj };
  }

  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/admin/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ settings: settingsObj })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update site settings');
  }
  return await res.json();
}

/**
 * Image Upload Helper (Base64 to Supabase Storage or Express /uploads file URL)
 */
export async function uploadImage(imageBase64, filename = 'image') {
  if (isSupabaseConfigured && supabase) {
    try {
      const blob = dataURItoBlob(imageBase64);
      if (blob) {
        const fileExt = filename.split('.').pop() || 'png';
        const cleanName = `bga_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `uploads/${cleanName}`;

        const { error: uploadError } = await supabase.storage
          .from('cms-media')
          .upload(filePath, blob, { contentType: blob.type, upsert: true });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('cms-media').getPublicUrl(filePath);
          return { success: true, url: publicUrlData.publicUrl };
        }
      }
    } catch (e) {
      console.warn('Supabase storage upload error, falling back to API upload:', e.message);
    }
  }

  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ imageBase64, filename })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Image upload failed');
  }
  return await res.json();
}

/**
 * Generic Helper for Collection CRUD (Programs, Gallery, Testimonials, FAQs, Branches)
 */
export async function saveCollectionItem(collection, item, isEdit = false) {
  const tableName = `cms_${collection}`;

  if (isSupabaseConfigured && supabase) {
    const payload = { ...item };
    if (Array.isArray(payload.highlights)) payload.highlights = JSON.stringify(payload.highlights);
    if (Array.isArray(payload.features)) payload.features = JSON.stringify(payload.features);

    if (isEdit && payload.id) {
      const { data, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq('id', payload.id)
        .select();
      if (error) throw new Error(error.message);
      return { success: true, item: data[0] };
    } else {
      delete payload.id;
      const { data, error } = await supabase
        .from(tableName)
        .insert([payload])
        .select();
      if (error) throw new Error(error.message);
      return { success: true, item: data[0] };
    }
  }

  const token = getToken();
  const url = isEdit
    ? `${API_BASE_URL}/admin/${collection}/${item.id}`
    : `${API_BASE_URL}/admin/${collection}`;
  const method = isEdit ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(item)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Failed to save ${collection} item`);
  }
  return await res.json();
}

export async function deleteCollectionItem(collection, id) {
  const tableName = `cms_${collection}`;

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true, id };
  }

  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/admin/${collection}/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Failed to delete ${collection} item`);
  }
  return await res.json();
}
