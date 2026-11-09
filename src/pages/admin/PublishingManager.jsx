import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { publishingApi } from '../../services/publishingApi';
import { uploadImage } from '../../services/cmsApi';
import { ContentPagination } from '../../components/PublishingCards';
import { EMPTY_ARTICLE, UPDATE_CATEGORIES } from '../../../shared/publishingRules.js';
import { MAX_IMAGE_BYTES } from '../../../shared/cmsRules.js';

const ArticleEditor = lazy(() => import('../../components/ArticleEditor'));
const fieldStyle = 'block mt-2 w-full p-3 bg-slate-950 rounded-xl border border-slate-600 text-white';
export default function PublishingManager({ kind }) {
  const news = kind === 'updates', title = news ? 'News & Updates' : 'Alumni Album';
  const [data, setData] = useState({ items: [], total: 0 }), [page, setPage] = useState(1), [category, setCategory] = useState(''), [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState(''), [draft, setDraft] = useState(null), [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false), [deleting, setDeleting] = useState(null);
  const sequence = useRef(0), lock = useRef(false);
  const load = useCallback(async () => {
    const version = ++sequence.current; setLoading(true); setError('');
    try { const result = await publishingApi.list(kind, { admin: true, page, category }); if (sequence.current === version) setData(result); }
    catch (err) { if (sequence.current === version) setError(err.message); }
    finally { if (sequence.current === version) setLoading(false); }
  }, [kind, page, category]);
  useEffect(() => { void load(); const version = sequence.current; return () => { sequence.current = version + 1; }; }, [load, revision]);
  async function edit(item) {
    setError(''); setNotice('');
    try { setDraft(await publishingApi.getItem(kind, item.id, { admin: true })); }
    catch (err) { setError(err.message); }
  }
  function create() { setError(''); setNotice(''); setDraft(news ? { title: '', category: 'news', summary: '', cover_image: '', body_json: EMPTY_ARTICLE, is_published: false } : { name: '', image: '', batch: '', company: '', position: '', display_order: 0, is_published: false }); }
  async function save(event) {
    event.preventDefault(); if (lock.current) return; lock.current = true; setSaving(true); setError('');
    try { await publishingApi.save(kind, draft); setDraft(null); setPage(1); setRevision((value) => value + 1); setNotice('Content saved successfully.'); }
    catch (err) { setError(err.message); }
    finally { lock.current = false; setSaving(false); }
  }
  async function remove() {
    if (lock.current) return; lock.current = true; setSaving(true); setError('');
    try { await publishingApi.remove(kind, deleting.id); setDeleting(null); setPage(1); setRevision((value) => value + 1); setNotice('Content deleted successfully.'); }
    catch (err) { setError(err.message); }
    finally { lock.current = false; setSaving(false); }
  }
  async function image(event) {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type) || file.size > MAX_IMAGE_BYTES) { setError('Choose a PNG, JPEG, GIF or WebP image, 5 MB or smaller.'); return; }
    setUploading(true); setError('');
    try {
      const encoded = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('The image could not be read.')); reader.readAsDataURL(file); });
      const result = await uploadImage(encoded, file.name); setDraft((current) => current ? { ...current, [news ? 'cover_image' : 'image']: result.url } : null);
    } catch (err) { setError(err.message); } finally { setUploading(false); }
  }
  function textField(label, key, options = {}) {
    const props = { value: draft[key] ?? '', onChange: (event) => setDraft({ ...draft, [key]: event.target.value }), className: fieldStyle, ...options };
    return <label key={key} className="block text-sm text-slate-300">{label}{options.multiline ? <textarea {...props} multiline={undefined} rows="4" /> : <input {...props} />}</label>;
  }
  return <section className="glass-panel rounded-3xl p-5 sm:p-7 space-y-6" aria-label={`${title} CMS`}>
    <div className="flex flex-wrap justify-between items-center gap-4"><div><h2 className="text-2xl font-bold">{title}</h2><p className="text-sm text-slate-400 mt-2">{news ? 'Manage news, event stories and announcements. Event posts do not create orientation schedules.' : 'Manage alumni profiles independently from Campus Gallery and Testimonials.'}</p></div><button type="button" onClick={create} className="btn-primary">{news ? 'Add update' : 'Add alumni profile'}</button></div>
    {notice && <p role="status" className="text-emerald-300">{notice}</p>}{error && !draft && !deleting && <p role="alert" className="text-red-300">{error} <button className="underline" onClick={() => setRevision((value) => value + 1)}>Retry loading content</button></p>}
    {news && <label className="block text-sm text-slate-300">Filter updates by category<select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="block mt-2 p-3 rounded-xl bg-slate-950 border border-slate-700"><option value="">All categories</option>{Object.entries(UPDATE_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
    {loading ? <p role="status">Loading content...</p> : <><div className="grid gap-4 sm:grid-cols-2">{data.items.map((item) => <article key={item.id} data-publishing-item={`${kind}:${item.id}`} className="p-5 border border-slate-700 rounded-2xl space-y-3 min-w-0"><p className="text-xs text-[#70a6ff]">{item.is_published ? 'Published' : 'Draft'}{news ? ` · ${UPDATE_CATEGORIES[item.category]}` : ` · ${item.batch || 'Batch not set'}`}</p><h3 className="text-lg font-bold break-words">{news ? item.title : item.name}</h3><p className="text-sm text-slate-400 break-words">{news ? item.summary : `${item.position || 'Position not set'} · ${item.company || 'Company not set'}`}</p><div className="flex gap-4 text-sm"><button onClick={() => edit(item)} className="text-[#70a6ff] underline">Edit</button><button className="text-red-300 underline" onClick={() => { setError(''); setDeleting(item); }}>Delete</button></div></article>)}</div>{!data.items.length && <p className="text-slate-400">{news ? 'No updates configured.' : 'No alumni profiles configured.'}</p>}<ContentPagination page={page} total={data.total} onPage={setPage} /></>}
    {draft && <div role="dialog" aria-modal="true" aria-label={news ? 'Update editor' : 'Alumni profile editor'} className="fixed inset-0 z-50 bg-slate-950/85 p-3 flex items-center justify-center"><form onSubmit={save} className="glass-panel p-5 sm:p-7 rounded-3xl border border-slate-600 max-w-3xl w-full max-h-[92dvh] overflow-y-auto space-y-5"><h3 className="text-2xl font-bold">{draft.id ? 'Edit' : 'Create'} {news ? 'update' : 'alumni profile'}</h3>{error && <p role="alert" className="text-red-300">{error}</p>}
      {textField(news ? 'Update title' : 'Alumni name', news ? 'title' : 'name', { required: true, maxLength: 255 })}
      {news ? <><label className="block text-sm">Update category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className={fieldStyle}>{Object.entries(UPDATE_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{textField('Update summary', 'summary', { multiline: true, maxLength: 2000 })}</> : <>{textField('Batch', 'batch', { maxLength: 150 })}{textField('Current company', 'company', { maxLength: 255 })}{textField('Current position', 'position', { maxLength: 255 })}</>}
      {textField(news ? 'Cover image URL' : 'Profile picture URL', news ? 'cover_image' : 'image', { maxLength: 500 })}<label className="block text-sm">{news ? 'Upload cover image' : 'Upload profile picture'}<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" disabled={uploading || saving} onChange={image} className="block mt-2 max-w-full" /></label>{(news ? draft.cover_image : draft.image) && <img src={news ? draft.cover_image : draft.image} alt="Upload preview" className="h-36 rounded-xl object-cover" />}
      {news ? <Suspense fallback={<p role="status">Loading article editor...</p>}><ArticleEditor key={draft.id || 'new'} value={draft.body_json} onChange={(body_json) => setDraft((current) => ({ ...current, body_json }))} /></Suspense> : textField('Display order', 'display_order', { type: 'number', min: 0 })}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!draft.is_published} onChange={(event) => setDraft({ ...draft, is_published: event.target.checked })} />Published on website</label><div className="flex flex-wrap gap-3"><button type="submit" disabled={saving || uploading} className="btn-primary disabled:opacity-40">{uploading ? 'Uploading...' : saving ? 'Saving...' : 'Save content'}</button><button type="button" disabled={saving} className="btn-secondary" onClick={() => { setDraft(null); setError(''); }}>Cancel editing</button></div>
    </form></div>}
    {deleting && <div role="dialog" aria-label="Delete published content" aria-modal="true" className="fixed inset-0 z-50 p-4 bg-slate-950/85 flex items-center justify-center"><div className="glass-panel max-w-md w-full rounded-3xl p-6 space-y-5"><h3 className="text-xl font-bold">Delete this {news ? 'update' : 'alumni profile'}?</h3><p className="break-words">{deleting.title || deleting.name}</p>{error && <p role="alert" className="text-red-300">{error}</p>}<div className="flex gap-4"><button className="btn-primary" disabled={saving} onClick={remove}>{saving ? 'Deleting...' : 'Confirm delete'}</button><button className="btn-secondary" disabled={saving} onClick={() => { setDeleting(null); setError(''); }}>Keep content</button></div></div></div>}
  </section>;
}
