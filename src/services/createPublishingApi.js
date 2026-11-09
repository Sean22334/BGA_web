import { PUBLISHING_KINDS, publishingPayload, publishingQuery } from '../../shared/publishingRules.js';

const updateSummary = 'id,title,category,summary,cover_image,is_published,published_at,created_at,updated_at';
export function createPublishingApi({ supabase = null, development = false, baseUrl = '/api', fetchImpl = globalThis.fetch, getToken = () => '' } = {}) {
  function checkKind(kind) { if (!PUBLISHING_KINDS.includes(kind)) throw new Error('Unknown content collection.'); }
  async function local(path, method = 'GET', body) {
    if (!development) throw new Error('Content service is temporarily unavailable. Please retry.');
    const response = await fetchImpl(`${baseUrl}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const data = await response.json().catch(() => null);
    if (!response.ok || data === null) throw Object.assign(new Error(data?.error || 'Content could not be loaded. Please retry.'), { notFound: response.status === 404 });
    return data;
  }
  async function remote(query) {
    const result = await query;
    if (result.error) throw new Error(result.error.message || 'Content service is temporarily unavailable. Please retry.');
    return result;
  }
  const api = {
    async list(kind, { admin = false, ...filters } = {}) {
      checkKind(kind);
      const options = publishingQuery(filters);
      if (!supabase) return local(`${admin ? '/admin' : ''}/${kind}?${new URLSearchParams(Object.entries(options).filter(([, value]) => value !== '')).toString()}`);
      let query = supabase.from(`cms_${kind}`).select(kind === 'updates' ? updateSummary : '*', { count: 'exact' });
      if (!admin) query = query.eq('is_published', true);
      if (kind === 'updates' && options.category) query = query.eq('category', options.category);
      if (kind === 'alumni' && options.batch) query = query.eq('batch', options.batch);
      query = admin ? query.order('updated_at', { ascending: false }).order('id', { ascending: false }) : kind === 'updates' ? query.order('published_at', { ascending: false, nullsFirst: false }).order('id', { ascending: false }) : query.order('display_order', { ascending: true }).order('id', { ascending: true });
      const { data, count } = await remote(query.range((options.page - 1) * options.pageSize, options.page * options.pageSize - 1));
      return { items: data || [], total: count ?? 0, page: options.page, pageSize: options.pageSize };
    },
    async getItem(kind, id, { admin = false } = {}) {
      checkKind(kind);
      if (!Number.isSafeInteger(Number(id)) || Number(id) < 1) throw Object.assign(new Error('Content not found.'), { notFound: true });
      if (!supabase) return local(`${admin ? '/admin' : ''}/${kind}/${id}`);
      let query = supabase.from(`cms_${kind}`).select('*').eq('id', id);
      if (!admin) query = query.eq('is_published', true);
      const { data } = await remote(query.maybeSingle());
      if (!data) throw Object.assign(new Error('Content not found.'), { notFound: true });
      return data;
    },
    async save(kind, item) {
      checkKind(kind);
      const payload = publishingPayload(kind, item);
      if (!supabase) return local(`/admin/${kind}${item.id ? `/${item.id}` : ''}`, item.id ? 'PUT' : 'POST', payload);
      const table = supabase.from(`cms_${kind}`);
      const { data } = await remote((item.id ? table.update(payload).eq('id', item.id) : table.insert([payload])).select('id'));
      if (!data?.length) throw new Error('Content was not saved. Reload the list and check administrator access.');
      return { success: true, id: data[0].id };
    },
    async remove(kind, id) {
      checkKind(kind);
      if (!supabase) return local(`/admin/${kind}/${id}`, 'DELETE');
      await remote(supabase.from(`cms_${kind}`).delete().eq('id', id));
      return { success: true, id };
    },
    async batches() {
      if (!supabase) return local('/alumni/batches');
      const { data } = await remote(supabase.rpc('cms_alumni_batches'));
      return (data || []).map((row) => row.batch);
    }
  };
  return api;
}
