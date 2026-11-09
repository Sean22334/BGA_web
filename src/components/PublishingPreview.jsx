import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publishingApi } from '../services/publishingApi';
import { AlumniCard, UpdateCard } from './PublishingCards';

export default function PublishingPreview({ kind }) {
  const [items, setItems] = useState([]), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    publishingApi.list(kind, { pageSize: kind === 'updates' ? 3 : 6 }).then((data) => { if (active) { setItems(data.items); setError(''); } }).catch(() => { if (active) setError('This content is temporarily unavailable.'); });
    return () => { active = false; };
  }, [kind, revision]);
  if (!items.length && !error) return null;
  const news = kind === 'updates';
  return <section id={news ? 'news' : 'alumni'} aria-label={news ? 'News & Updates' : 'Alumni Album'} className="py-24 bg-[#050D1A] px-4 sm:px-6">
    <div className="max-w-7xl mx-auto"><div className="flex flex-wrap justify-between items-end gap-5 mb-10"><div><p className="text-[#70a6ff] text-xs uppercase tracking-widest font-bold mb-3">{news ? 'Around the Academy' : 'Our Alumni'}</p><h2 className="text-3xl sm:text-5xl font-bold text-white">{news ? 'News & Updates' : 'Alumni Album'}</h2></div><Link className="btn-secondary" to={news ? '/news' : '/alumni'}>{news ? 'View all updates' : 'View all alumni'}</Link></div>
      {error ? <div role="alert" className="text-slate-300">{error} <button className="underline" onClick={() => setRevision((value) => value + 1)}>Retry</button></div> : <div className={`grid gap-6 sm:grid-cols-2 ${news ? 'lg:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-6'}`}>{items.map((item) => news ? <UpdateCard key={item.id} item={item} /> : <AlumniCard key={item.id} item={item} />)}</div>}
    </div>
  </section>;
}
