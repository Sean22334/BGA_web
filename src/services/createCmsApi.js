import { CMS_COLLECTIONS, normalizeCmsContent } from '../lib/cmsContent.js';
import { cmsPayload, imageData } from '../../shared/cmsRules.js';
import { validateAboutSettings } from '../../shared/publishingRules.js';

// Injection keeps local tests independent of real Supabase credentials and storage.
export function createCmsApi({ supabase = null, development = false, baseUrl = '/api', fetchImpl = globalThis.fetch, getToken = () => '' } = {}) {
  async function local(route, method = 'GET', body) {
    if (!development) throw new Error('The CMS service is temporarily unavailable. Please retry shortly.');
    const response = await fetchImpl(`${baseUrl}${route}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || 'The CMS request failed. Please retry.');
    if (!data || typeof data !== 'object') throw new Error('The CMS returned an invalid response. Please retry.');
    return data;
  }
  async function readContent(drafts) {
    if (!supabase) return normalizeCmsContent(await local(drafts ? '/admin/content/all' : '/content/public'));
    const results = await Promise.all([
      supabase.from('site_settings').select('*'),
      ...CMS_COLLECTIONS.map((collection) => {
        let query = supabase.from(`cms_${collection}`).select('*');
        if (!drafts) query = query.eq('is_published', true);
        return query.order('display_order', { ascending: true });
      })
    ]);
    const failure = results.find((result) => result.error);
    if (failure) throw new Error(failure.error.message || 'Website content could not be loaded.');
    const content = { settings: Object.fromEntries((results[0].data || []).map((row) => [row.setting_key, row.setting_value])) };
    CMS_COLLECTIONS.forEach((collection, index) => { content[collection] = results[index + 1].data || []; });
    return normalizeCmsContent(content);
  }
  return {
    getPublicContent: () => readContent(false),
    getAdminCMSContent: () => readContent(true),
    async updateSiteSettings(settings) {
      validateAboutSettings(settings);
      if (!supabase) return local('/admin/settings', 'PUT', { settings });
      const rows = Object.entries(settings).map(([setting_key, value]) => ({ setting_key, setting_value: typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value) }));
      const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'setting_key' });
      if (error) throw new Error(error.message);
      return { success: true };
    },
    async saveCollectionItem(collection, item, isEdit = false) {
      const payload = cmsPayload(collection, item, { creating: !isEdit });
      if (isEdit && !item.id) throw new Error('A content ID is required for editing.');
      if (!supabase) return local(`/admin/${collection}${isEdit ? `/${item.id}` : ''}`, isEdit ? 'PUT' : 'POST', payload);
      for (const field of ['highlights', 'features']) if (field in payload) payload[field] = JSON.stringify(payload[field]);
      const table = supabase.from(`cms_${collection}`);
      const { data, error } = await (isEdit ? table.update(payload).eq('id', item.id) : table.insert([payload])).select();
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error('Content was not saved. Reload the list and check your administrator access.');
      return { success: true, item: data[0] };
    },
    async deleteCollectionItem(collection, id) {
      if (!CMS_COLLECTIONS.includes(collection)) throw new Error('Unknown CMS collection.');
      if (!supabase) return local(`/admin/${collection}/${id}`, 'DELETE');
      const { error } = await supabase.from(`cms_${collection}`).delete().eq('id', id);
      if (error) throw new Error(error.message);
      return { success: true, id };
    },
    async uploadImage(data, filename = 'image') {
      const image = imageData(data);
      if (!supabase) return local('/upload', 'POST', { imageBase64: data, filename });
      const bytes = Uint8Array.from(atob(image.base64), (character) => character.charCodeAt(0));
      const filePath = `uploads/bga_${globalThis.crypto.randomUUID()}.${image.extension}`;
      const bucket = supabase.storage.from('cms-media');
      const { error } = await bucket.upload(filePath, new Blob([bytes], { type: image.mime }), { contentType: image.mime, upsert: false });
      if (error) throw new Error(error.message);
      const { data: result } = bucket.getPublicUrl(filePath);
      if (!result?.publicUrl) throw new Error('The image URL could not be retrieved.');
      return { success: true, url: result.publicUrl };
    }
  };
}
