import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publishingApi } from '../services/publishingApi';
import { UPDATE_CATEGORIES } from '../../shared/publishingRules.js';
import RichText from '../components/RichText';

export default function NewsDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(null), [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError(null);
    publishingApi.getItem('updates', id).then((row) => { if (active) setItem(row); }).catch((err) => { if (active) setError(err); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, revision]);
  return <main className="pt-36 pb-24 px-4 sm:px-6 max-w-4xl mx-auto w-full min-w-0"><Link to="/news" className="text-[#70a6ff] inline-block mb-8">← All news & updates</Link>
    {loading ? <p role="status">Loading update...</p> : error ? <div role="alert"><h1 className="text-3xl font-bold mb-4">{error.notFound ? 'Update not found' : 'Update could not be loaded'}</h1><p className="text-slate-400">{error.notFound ? 'This update may be unpublished or no longer available.' : error.message}</p>{!error.notFound && <button className="btn-secondary mt-4" onClick={() => setRevision((value) => value + 1)}>Retry loading update</button>}</div> : item && <article><p className="text-[#70a6ff] font-bold text-sm mb-3">{UPDATE_CATEGORIES[item.category]}</p><h1 className="text-3xl sm:text-5xl font-bold text-white break-words mb-5">{item.title}</h1>{item.published_at && <time dateTime={item.published_at} className="text-sm text-slate-400">{new Date(item.published_at).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' })}</time>}<p className="text-lg text-slate-300 my-7 break-words">{item.summary}</p><img src={item.cover_image} alt={item.title} className="w-full max-h-[32rem] object-cover rounded-3xl mb-10" /><RichText value={item.body_json} /></article>}
  </main>;
}
