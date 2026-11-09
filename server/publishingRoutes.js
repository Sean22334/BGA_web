import { PUBLISHING_KINDS, publishingPayload, publishingQuery } from '../shared/publishingRules.js';
import { published } from '../shared/cmsRules.js';

const summaries = 'id,title,category,summary,cover_image,is_published,published_at,created_at,updated_at';
function fromDatabase(row) {
  if (!row) return row;
  const result = { ...row };
  if (typeof result.body_json === 'string') result.body_json = JSON.parse(result.body_json);
  for (const key of ['published_at', 'created_at', 'updated_at']) if (result[key] && typeof result[key] === 'string' && !/[zZ]|[+-]\d\d:\d\d$/.test(result[key])) result[key] = result[key].replace(' ', 'T') + 'Z';
  result.is_published = published(result.is_published);
  return result;
}
export function registerPublishingRoutes(app, { getPool, authenticate }) {
  const store = { updates: [], alumni: [] }, nextId = { updates: 1, alumni: 1 };
  const validId = (input) => Number.isSafeInteger(Number(input)) && Number(input) > 0;
  const fail = (res) => res.status(503).json({ error: 'Content service is temporarily unavailable. Please retry.' });
  app.get('/api/alumni/batches', async (_req, res) => {
    try {
      const pool = getPool();
      const values = pool ? (await pool.query('SELECT DISTINCT batch FROM cms_alumni WHERE is_published = 1 AND TRIM(batch) <> ? ORDER BY batch', ['']))[0].map((row) => row.batch) : [...new Set(store.alumni.filter((row) => row.is_published).map((row) => row.batch))].sort();
      return res.json(values);
    } catch { return fail(res); }
  });
  for (const kind of PUBLISHING_KINDS) {
    const listing = (admin) => async (req, res) => {
      let query;
      try { query = publishingQuery(req.query); } catch (error) { return res.status(400).json({ error: error.message }); }
      try {
        const { page, pageSize, category, batch } = query;
        const pool = getPool();
        let total, items;
        if (pool) {
          const clauses = admin ? [] : ['is_published = 1'], args = [];
          if (kind === 'updates' && category) { clauses.push('category = ?'); args.push(category); }
          if (kind === 'alumni' && batch) { clauses.push('batch = ?'); args.push(batch); }
          const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
          total = Number((await pool.query(`SELECT COUNT(*) AS total FROM cms_${kind}${where}`, args))[0][0].total);
          const order = admin ? 'updated_at DESC, id DESC' : kind === 'updates' ? 'published_at DESC, id DESC' : 'display_order ASC, id ASC';
          items = (await pool.query(`SELECT ${kind === 'updates' ? summaries : '*'} FROM cms_${kind}${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [...args, pageSize, (page - 1) * pageSize]))[0].map(fromDatabase);
        } else {
          const rows = store[kind].filter((row) => (admin || row.is_published) && (kind !== 'updates' || !category || row.category === category) && (kind !== 'alumni' || !batch || row.batch === batch));
          rows.sort(admin ? (a, b) => b.updated_at.localeCompare(a.updated_at) || b.id - a.id : kind === 'updates' ? (a, b) => (b.published_at || '').localeCompare(a.published_at || '') || b.id - a.id : (a, b) => a.display_order - b.display_order || a.id - b.id);
          total = rows.length;
          items = rows.slice((page - 1) * pageSize, page * pageSize).map((row) => {
            const copy = { ...row };
            if (kind === 'updates') delete copy.body_json;
            return copy;
          });
        }
        return res.json({ items, total, page, pageSize });
      } catch { return fail(res); }
    };
    const detail = (admin) => async (req, res) => {
      if (!validId(req.params.id)) return res.status(404).json({ error: 'Content not found.' });
      try {
        const id = Number(req.params.id), pool = getPool();
        const row = pool ? fromDatabase((await pool.query(`SELECT * FROM cms_${kind} WHERE id = ?${admin ? '' : ' AND is_published = 1'}`, [id]))[0][0]) : store[kind].find((item) => item.id === id && (admin || item.is_published));
        return row ? res.json(row) : res.status(404).json({ error: 'Content not found.' });
      } catch { return fail(res); }
    };
    app.get(`/api/${kind}`, listing(false));
    if (kind === 'updates') app.get('/api/updates/:id', detail(false));
    const route = `/api/admin/${kind}`;
    app.get(route, authenticate, listing(true));
    app.get(`${route}/:id`, authenticate, detail(true));
    const save = (creating) => async (req, res) => {
      if (!creating && !validId(req.params.id)) return res.status(400).json({ error: 'Invalid content ID.' });
      try {
        const id = Number(req.params.id), pool = getPool();
        const previous = creating ? null : pool ? fromDatabase((await pool.query(`SELECT * FROM cms_${kind} WHERE id = ?`, [id]))[0][0]) : store[kind].find((item) => item.id === id);
        if (!creating && !previous) return res.status(404).json({ error: 'Content no longer exists. Reload the list.' });
        let payload;
        try { payload = publishingPayload(kind, req.body); } catch (error) { return res.status(400).json({ error: error.message }); }
        const now = new Date().toISOString();
        if (kind === 'updates') payload.published_at = previous?.published_at || (payload.is_published ? now : null);
        let savedId = id;
        if (pool) {
          const fields = Object.keys(payload), values = fields.map((key) => key === 'body_json' ? JSON.stringify(payload[key]) : key === 'published_at' && payload[key] ? payload[key].slice(0, 23).replace('T', ' ') : payload[key]);
          if (creating) savedId = (await pool.query(`INSERT INTO cms_${kind} (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')})`, values))[0].insertId;
          else await pool.query(`UPDATE cms_${kind} SET ${fields.map((key) => `${key} = ?`).join(',')} WHERE id = ?`, [...values, id]);
        } else {
          if (creating) savedId = nextId[kind]++;
          const row = { ...payload, id: savedId, created_at: previous?.created_at || now, updated_at: now };
          if (creating) store[kind].push(row);
          else store[kind].splice(store[kind].findIndex((item) => item.id === id), 1, row);
        }
        return res.status(creating ? 201 : 200).json({ success: true, id: savedId });
      } catch { return fail(res); }
    };
    app.post(route, authenticate, save(true));
    app.put(`${route}/:id`, authenticate, save(false));
    app.delete(`${route}/:id`, authenticate, async (req, res) => {
      if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid content ID.' });
      try {
        const pool = getPool(), id = Number(req.params.id);
        if (pool) await pool.query(`DELETE FROM cms_${kind} WHERE id = ?`, [id]);
        else { const index = store[kind].findIndex((row) => row.id === id); if (index >= 0) store[kind].splice(index, 1); }
        return res.json({ success: true, id });
      } catch { return fail(res); }
    });
  }
}
