import React from 'react';
import { Link } from 'react-router-dom';
import { UPDATE_CATEGORIES } from '../../shared/publishingRules.js';

export function UpdateCard({ item }) {
  return <article className="surface-card overflow-hidden flex flex-col min-w-0">
    <Link to={`/news/${item.id}`} className="block"><img src={item.cover_image} alt={item.title} className="h-52 w-full object-cover" loading="lazy" /></Link>
    <div className="p-6 space-y-3 flex-1 flex flex-col items-start">
      <span className="text-xs font-bold uppercase tracking-widest text-[#70a6ff]">{UPDATE_CATEGORIES[item.category]}</span>
      {item.published_at && <time dateTime={item.published_at} className="text-xs text-slate-400">{new Date(item.published_at).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' })}</time>}
      <h3 className="text-xl font-bold text-white break-words"><Link to={`/news/${item.id}`}>{item.title}</Link></h3>
      <p className="text-sm text-slate-400 break-words line-clamp-3 flex-1">{item.summary}</p>
      <Link to={`/news/${item.id}`} aria-label={`Read ${item.title}`} className="text-[#70a6ff] font-semibold text-sm">Read update →</Link>
    </div>
  </article>;
}
export function AlumniCard({ item }) {
  return <article className="surface-card overflow-hidden min-w-0">
    <img src={item.image} alt={item.name} loading="lazy" className="aspect-[4/5] w-full object-cover object-top" />
    <div className="p-5 space-y-2 break-words"><p className="text-[#70a6ff] text-xs font-bold">{item.batch}</p><h3 className="text-xl font-bold text-white">{item.name}</h3><p className="text-slate-200">{item.position}</p><p className="text-sm text-slate-400">{item.company}</p></div>
  </article>;
}
export function ContentPagination({ page, total, onPage, pageSize = 12 }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return <nav aria-label="Content pages" className="flex items-center justify-center gap-4 mt-10 text-sm"><button type="button" className="btn-secondary disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous page</button><span>Page {page} of {pages}</span><button type="button" className="btn-secondary disabled:opacity-40" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next page</button></nav>;
}
