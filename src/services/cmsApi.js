const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const getToken = () => localStorage.getItem('bga_admin_token') || '';

/**
 * Fetch Public Content for Website
 */
export async function getPublicContent() {
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
 * Image Upload Helper (Base64 to /uploads file URL)
 */
export async function uploadImage(imageBase64, filename = 'image') {
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
