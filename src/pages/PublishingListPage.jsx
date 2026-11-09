import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { publishingApi } from '../services/publishingApi';
import { AlumniCard, ContentPagination, UpdateCard } from '../components/PublishingCards';
import { UPDATE_CATEGORIES } from '../../shared/publishingRules.js';

export default function PublishingListPage({ kind }) {
  const [search, setSearch] = useSearchParams(), [data, setData] = useState({ items: [], total: 0 }), [batches, setBatches] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const news = kind === 'updates', filter = search.get(news ? 'category' : 'batch') || '', page = Number(search.get('page') || 1);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([publishingApi.list(kind, { page, ...(news ? { category: filter } : { batch: filter }) }), news ? Promise.resolve([]) : publishingApi.batches()]).then(([result, batchNames]) => { if (active) { setData(result); setBatches(batchNames); } }).catch((err) => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind, news, filter, page, revision]);
  function change(nextFilter, nextPage = 1) { setSearch({ ...(nextFilter ? { [news ? 'category' : 'batch']: nextFilter } : {}), ...(nextPage > 1 ? { page: String(nextPage) } : {}) }); }
  return <main className="pt-36 pb-24 px-4 sm:px-6 max-w-7xl mx-auto w-full min-w-0"><h1 className="text-4xl sm:text-5xl font-bold text-white mb-5">{news ? 'News & Updates' : 'Alumni Album'}</h1><p className="text-slate-400 mb-8">{news ? 'News, events and announcements from Bluechef Global Academy.' : 'Meet our alumni and discover where their careers have taken them.'}</p>
    {news ? <div className="flex flex-wrap gap-2 mb-8" aria-label="Update categories">{[['', 'All'], ...Object.entries(UPDATE_CATEGORIES)].map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => change(key)} className={`px-4 py-2 rounded-xl border ${filter === key ? 'bg-[#2670f2] border-[#2670f2] text-white' : 'border-slate-700 text-slate-300'}`}>{label}</button>)}</div> : <label className="block text-sm text-slate-300 mb-8">Filter by batch<select value={filter} onChange={(event) => change(event.target.value)} className="block mt-2 p-3 rounded-xl bg-slate-950 border border-slate-700 max-w-full"><option value="">All batches</option>{filter && !batches.includes(filter) && <option value={filter}>{filter}</option>}{batches.map((batch) => <option key={batch} value={batch}>{batch}</option>)}</select></label>}
    {loading ? <p role="status">Loading {news ? 'updates' : 'alumni'}...</p> : error ? <div role="alert" className="text-red-300">{error} <button className="underline" onClick={() => setRevision((value) => value + 1)}>Retry loading content</button></div> : <><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((item) => news ? <UpdateCard key={item.id} item={item} /> : <AlumniCard key={item.id} item={item} />)}</div>{!data.items.length && <p className="text-slate-400 py-12">{news ? 'No published updates found.' : 'No published alumni profiles found.'}</p>}<ContentPagination page={page} total={data.total} onPage={(next) => change(filter, next)} /></>}
  </main>;
}
