import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CMS_FIELDS, cmsPayload, imageData, published } from '../shared/cmsRules.js';
import { normalizeCmsContent } from '../src/lib/cmsContent.js';
import { validateAboutSettings } from '../shared/publishingRules.js';

// Only keys from this fixed allowlist can become SQL table/column identifiers.
export function registerCmsRoutes(app, { store, settings, getPool, authenticate, uploadsDir }) {
  const collections = Object.keys(CMS_FIELDS);
  const nextIds = Object.fromEntries(collections.map((collection) => [collection, Math.max(0, ...store[collection].map((row) => row.id)) + 1]));
  const sort = (rows) => [...rows].sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0) || Number(a.id) - Number(b.id));
  const readContent = async (drafts) => {
    const pool = getPool();
    const content = { settings: { ...settings } };
    if (pool) {
      const [rows] = await pool.query('SELECT setting_key, setting_value FROM site_settings');
      content.settings = Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value]));
    }
    for (const collection of collections) {
      const rows = pool ? (await pool.query(`SELECT * FROM cms_${collection} ORDER BY display_order ASC, id ASC`))[0] : store[collection];
      content[collection] = sort(drafts ? rows : rows.filter((row) => published(row.is_published)));
    }
    return normalizeCmsContent(content);
  };
  const read = (drafts) => async (_req, res) => {
    try { return res.json(await readContent(drafts)); }
    catch { return res.status(503).json({ error: 'Website content could not be loaded. Please retry.' }); }
  };
  app.get('/api/content/public', read(false));
  app.get('/api/admin/content/all', authenticate, read(true));
  app.put('/api/admin/settings', authenticate, async (req, res) => {
    const input = req.body?.settings;
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.values(input).some((value) => value === null || !['string', 'number', 'boolean', 'object'].includes(typeof value))) {
      return res.status(400).json({ error: 'Website settings must be an object of values.' });
    }
    const rows = Object.entries(input).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : String(value)]);
    try { validateAboutSettings(input); } catch (error) { return res.status(400).json({ error: error.message }); }
    if (rows.some(([key]) => !/^[a-z][a-z0-9_]{0,99}$/.test(key))) return res.status(400).json({ error: 'Invalid website setting key.' });
    const pool = getPool();
    if (pool) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        for (const row of rows) await connection.query('INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)', row);
        await connection.commit();
      } catch {
        await connection.rollback();
        return res.status(503).json({ error: 'Website settings could not be saved. Please retry.' });
      } finally { connection.release(); }
    } else for (const [key, value] of rows) settings[key] = value;
    return res.json({ success: true });
  });

  for (const collection of collections) {
    const route = `/api/admin/${collection}`;
    const key = { programs: 'program_id', branches: 'branch_key', faqs: 'faq_key', stats: 'stat_key', partners: 'name' }[collection];
    const save = (creating) => async (req, res) => {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ error: 'Content must be an object.' });
      const id = Number(req.params.id);
      if (!creating && (!Number.isSafeInteger(id) || id < 1)) return res.status(400).json({ error: 'Invalid content ID.' });
      const pool = getPool();
      try {
        const previous = creating ? null : pool
          ? (await pool.query(`SELECT * FROM cms_${collection} WHERE id = ?`, [id]))[0][0]
          : store[collection].find((row) => row.id === id);
        if (!creating && !previous) return res.status(404).json({ error: 'Content no longer exists. Reload the list.' });
        let item;
        try { item = cmsPayload(collection, { ...previous, ...req.body }, { creating }); }
        catch (error) { return res.status(400).json({ error: error.message }); }
        if (!creating && collection === 'branches') item.branch_key = previous.branch_key;
        if (!pool && key && store[collection].some((row) => row.id !== id && String(row[key]).toLowerCase() === item[key].toLowerCase())) return res.status(409).json({ error: 'A record with this unique key or name already exists.' });
        if (pool) {
          const fields = Object.keys(item);
          const values = fields.map((field) => Array.isArray(item[field]) ? JSON.stringify(item[field]) : item[field]);
          if (creating) {
            const [result] = await pool.query(`INSERT INTO cms_${collection} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, values);
            item.id = result.insertId;
          } else {
            await pool.query(`UPDATE cms_${collection} SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`, [...values, id]);
            item.id = id;
          }
        } else if (creating) {
          item.id = nextIds[collection]++;
          store[collection].push(item);
        } else {
          item.id = id;
          store[collection].splice(store[collection].findIndex((row) => row.id === id), 1, item);
        }
        return res.status(creating ? 201 : 200).json({ success: true, id: item.id, item });
      } catch (error) {
        return res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 503).json({ error: error.code === 'ER_DUP_ENTRY' ? 'A record with this unique key or name already exists.' : 'Content could not be saved. Please retry.' });
      }
    };
    app.post(route, authenticate, save(true));
    app.put(`${route}/:id`, authenticate, save(false));
    app.delete(`${route}/:id`, authenticate, async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid content ID.' });
      try {
        const pool = getPool();
        if (pool) await pool.query(`DELETE FROM cms_${collection} WHERE id = ?`, [id]);
        else {
          const index = store[collection].findIndex((row) => row.id === id);
          if (index >= 0) store[collection].splice(index, 1);
        }
        return res.json({ success: true, id });
      } catch { return res.status(503).json({ error: 'Content could not be deleted. Please retry.' }); }
    });
  }

  app.post('/api/upload', authenticate, async (req, res) => {
    let image;
    try { image = imageData(req.body?.imageBase64); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    try {
      const filename = `bga_${randomUUID()}.${image.extension}`;
      await mkdir(uploadsDir, { recursive: true });
      await writeFile(path.join(uploadsDir, filename), image.base64, 'base64');
      return res.json({ url: `/uploads/${filename}`, filename });
    } catch { return res.status(503).json({ error: 'Image could not be saved. Please retry.' }); }
  });
}
