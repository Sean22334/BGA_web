import React, { useState } from 'react';

const FIELDS = {
  stats: [
    ['stat_key', 'Unique key', 'text'], ['value', 'Value', 'text'], ['label', 'Label', 'text'], ['icon', 'Icon (Award, Users, MapPin, Anchor)', 'text']
  ],
  partners: [['name', 'Partner name', 'text'], ['logo_url', 'Logo URL (optional)', 'url']]
};

export default function CmsSimpleCollection({ collection, items, saving, onSave, onDelete }) {
  const [draft, setDraft] = useState(null);
  const title = collection === 'stats' ? 'Academy statistics' : 'Partners';
  const emptyItem = collection === 'stats'
    ? { stat_key: '', value: '', label: '', icon: 'Award', display_order: 0, is_published: false }
    : { name: '', logo_url: '', display_order: 0, is_published: false };

  return (
    <section className="glass-panel rounded-3xl border border-white/10 p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold text-white">{title}</h2><p className="text-sm text-slate-400">Publish only verified figures and partner information.</p></div>
        <button type="button" onClick={() => setDraft(emptyItem)} className="btn-primary">Add {collection === 'stats' ? 'statistic' : 'partner'}</button>
      </div>
      {draft && (
        <form onSubmit={async (event) => { event.preventDefault(); await onSave(collection, draft, !!draft.id); }} className="grid sm:grid-cols-2 gap-4 border border-slate-700 rounded-2xl p-5">
          {FIELDS[collection].map(([field, label, type]) => (
            <label key={field} className="text-sm text-slate-300">{label}<input type={type} required={field !== 'logo_url'} value={draft[field] || ''} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} className="mt-1 block w-full rounded-xl bg-slate-950 border border-slate-600 p-3 text-white" /></label>
          ))}
          <label className="text-sm text-slate-300">Display order<input type="number" min="0" value={draft.display_order ?? 0} onChange={(event) => setDraft({ ...draft, display_order: Number(event.target.value) })} className="mt-1 block w-full rounded-xl bg-slate-950 border border-slate-600 p-3 text-white" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!draft.is_published} onChange={(event) => setDraft({ ...draft, is_published: event.target.checked })} /> Published</label>
          <div className="flex gap-3"><button disabled={saving} type="submit" className="btn-primary disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button><button type="button" onClick={() => setDraft(null)} className="btn-secondary">Close editor</button></div>
        </form>
      )}
      {items.length === 0 && <p className="text-slate-400">No {collection} configured.</p>}
      {items.map((item) => (
        <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border border-slate-800 rounded-xl p-4">
          <div><p className="font-semibold text-white">{collection === 'stats' ? `${item.value} ${item.label}` : item.name}</p><p className="text-xs text-slate-400">{item.is_published ? 'Published' : 'Draft'} · Order {item.display_order || 0}</p></div>
          <div className="flex gap-3"><button type="button" onClick={() => setDraft({ ...item })} className="text-sm text-[#70a6ff]">Edit</button><button type="button" disabled={saving} onClick={() => onDelete(item)} className="text-sm text-red-300">Delete</button></div>
        </div>
      ))}
    </section>
  );
}
