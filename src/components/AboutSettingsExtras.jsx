import React from 'react';
import { parseList } from '../lib/cmsContent';
import { published } from '../../shared/cmsRules.js';
import { useContent } from '../context/useContent';

export default function AboutSettingsExtras({ settings, setSettings, onUpload, uploading }) {
  const { settings: publicSettings } = useContent();
  const items = parseList(Object.hasOwn(settings, 'about_why_items') ? settings.about_why_items : publicSettings.about_why_items);
  const whyTitle = Object.hasOwn(settings, 'about_why_title') ? settings.about_why_title : publicSettings.about_why_title;
  const setItems = (next) => setSettings({ ...settings, about_why_items: next });
  function change(index, key, value) { setItems(items.map((item, i) => i === index ? { ...item, [key]: value } : item)); }
  function move(index, direction) { const next = [...items]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; setItems(next); }
  const input = 'block mt-2 w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white';
  return <>
    <section aria-label="Our History editor" className="border-t border-slate-700 pt-7 space-y-5"><h3 className="text-xl font-bold">Our History</h3><p className="text-sm text-slate-400">Enter the academy's approved story. This section stays hidden until enabled.</p>
      <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={published(settings.about_history_enabled)} onChange={(event) => setSettings({ ...settings, about_history_enabled: event.target.checked })} />Show Our History on the website</label>
      <label className="block text-sm">History heading<input value={settings.about_history_title ?? 'Our History'} onChange={(event) => setSettings({ ...settings, about_history_title: event.target.value })} className={input} /></label>
      <label className="block text-sm">History story<textarea rows="6" value={settings.about_history_body || ''} onChange={(event) => setSettings({ ...settings, about_history_body: event.target.value })} className={input} /></label>
      <label className="block text-sm">History image URL (optional)<input value={settings.about_history_image || ''} onChange={(event) => setSettings({ ...settings, about_history_image: event.target.value })} className={input} /></label>
      <label className="block text-sm">Upload history image<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" disabled={uploading} onChange={(event) => onUpload(event, (url) => setSettings((current) => ({ ...current, about_history_image: url })))} className="block mt-2 max-w-full" /></label>
      {settings.about_history_image && <img src={settings.about_history_image} alt="History preview" className="h-36 rounded-xl object-cover" />}
    </section>
    <section aria-label="Why Choose editor" className="border-t border-slate-700 pt-7 space-y-5"><h3 className="text-xl font-bold">Why Choose Bluechef Global Academy</h3><label className="block text-sm">Why Choose section title<input className={input} value={whyTitle || ''} onChange={(event) => setSettings({ ...settings, about_why_title: event.target.value })} /></label>
      {items.map((item, index) => <fieldset key={index} className="rounded-2xl border border-slate-700 p-4 space-y-4"><legend className="px-2 text-sm text-slate-400">Why Choose card {index + 1}</legend><label className="block text-sm">Card title<input className={input} value={item.title || ''} onChange={(event) => change(index, 'title', event.target.value)} /></label><label className="block text-sm">Card description<textarea className={input} rows="3" value={item.desc || ''} onChange={(event) => change(index, 'desc', event.target.value)} /></label><label className="block text-sm">Card icon<select className={input} value={item.icon || 'ShieldCheck'} onChange={(event) => change(index, 'icon', event.target.value)}>{['ShieldCheck', 'Building2', 'Anchor', 'Sparkles'].map((icon) => <option key={icon}>{icon}</option>)}</select></label><div className="flex flex-wrap gap-4 text-sm"><button type="button" disabled={index === 0} className="disabled:opacity-30 underline" onClick={() => move(index, -1)}>Move card up</button><button type="button" disabled={index === items.length - 1} className="disabled:opacity-30 underline" onClick={() => move(index, 1)}>Move card down</button><button type="button" className="text-red-300 underline" onClick={() => setItems(items.filter((_, i) => i !== index))}>Remove card</button></div></fieldset>)}
      {!items.length && <p className="text-slate-400 text-sm">No Why Choose cards configured. Saving an empty list removes this section from the website.</p>}<button type="button" className="btn-secondary" disabled={items.length >= 30} onClick={() => setItems([...items, { title: '', desc: '', icon: 'ShieldCheck' }])}>Add Why Choose card</button>
    </section>
  </>;
}
