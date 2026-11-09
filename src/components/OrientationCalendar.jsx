import React, { useState } from 'react';
import { monthDays, monthLabel, moveMonth } from '../../shared/calendar.js';
import { remainingSlots, todayInManila } from '../../shared/reservationRules.js';

export default function OrientationCalendar({ events, onCreate, onEdit }) {
  const today = todayInManila();
  const [month, setMonth] = useState(today.slice(0, 7)), [selected, setSelected] = useState(today);
  const days = monthDays(month), grouped = new Map();
  for (const item of events) { const date = item.date.slice(0, 10); if (!grouped.has(date)) grouped.set(date, []); grouped.get(date).push(item); }
  const agenda = grouped.get(selected) || [];
  function navigate(offset) { const next = moveMonth(month, offset); setMonth(next); setSelected(`${next}-01`); }
  return <section aria-label="Orientation calendar" className="glass-panel rounded-3xl overflow-hidden">
    <div className="flex flex-wrap justify-between items-center gap-3 p-4 sm:p-6"><h2 className="text-xl font-bold" aria-live="polite">{monthLabel(month)}</h2><div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary text-xs" onClick={() => navigate(-1)}>Previous month</button><button type="button" className="btn-secondary text-xs" onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); }}>Today</button><button type="button" className="btn-secondary text-xs" onClick={() => navigate(1)}>Next month</button></div></div>
    <div role="grid" aria-label={monthLabel(month)}><div role="row" className="grid grid-cols-7 border-y border-slate-700">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} role="columnheader" className="text-center py-3 text-xs text-slate-400">{day}</div>)}</div>
      {Array.from({ length: 6 }, (_, week) => <div key={week} role="row" className="grid grid-cols-7">{days.slice(week * 7, week * 7 + 7).map((date) => {
        const rows = grouped.get(date) || [];
        return <div key={date} role="gridcell" aria-selected={selected === date} className={`min-w-0 min-h-20 md:min-h-32 p-1 sm:p-2 border-r border-b border-slate-800 ${date === selected ? 'bg-blue-500/15' : date.startsWith(month) ? '' : 'bg-slate-950/70 text-slate-500'}`}>
          <button type="button" aria-label={`Create orientation on ${date}`} aria-current={date === today ? 'date' : undefined} onClick={() => { setSelected(date); onCreate(date); }} className={`h-7 w-7 rounded-full text-xs font-bold ${date === today ? 'bg-[#2670f2] text-white' : 'hover:bg-white/10'}`}>{Number(date.slice(-2))}</button>
          <div className="hidden md:block space-y-1 mt-1">{rows.slice(0, 3).map((event) => <button type="button" key={event.id} aria-label={`Edit ${event.title} on ${date}`} onClick={() => { setSelected(date); onEdit(event); }} className={`block w-full text-left text-[10px] rounded p-1 break-words ${event.status === 'Draft' ? 'bg-amber-500/10 text-amber-300' : event.status === 'Closed' ? 'bg-slate-700/40 text-slate-400' : 'bg-blue-500/15 text-blue-200'}`}><span className="font-semibold">{event.start_time} · {event.branch}</span><span className="block truncate">{event.title}</span></button>)}{rows.length > 3 && <button className="text-xs underline" onClick={() => setSelected(date)}>View all {rows.length}</button>}</div>
          {rows.length > 0 && <button type="button" aria-label={`View ${rows.length} orientations on ${date}`} onClick={() => setSelected(date)} className="md:hidden block text-[9px] text-blue-300 mt-1 break-words">{rows.length} {rows.length === 1 ? 'event' : 'events'}</button>}
        </div>;
      })}</div>)}
    </div>
    <div role="region" className="p-4 sm:p-6 space-y-4" aria-label="Selected day orientations"><div className="flex flex-wrap justify-between items-center gap-3"><h3 className="font-bold">Orientations on {selected}</h3><button type="button" className="btn-secondary text-xs" onClick={() => onCreate(selected)}>Create on selected date</button></div>{!agenda.length && <p className="text-sm text-slate-400">No orientations on this date.</p>}{agenda.map((event) => <button type="button" key={event.id} onClick={() => onEdit(event)} className="block w-full text-left border border-slate-700 rounded-xl p-4 space-y-2"><span className="block font-bold break-words">{event.title}</span><span className="block text-xs text-slate-300">{event.branch} · {event.start_time} – {event.end_time} · {event.status}</span><span className="block text-xs text-slate-400">{event.reserved} / {event.capacity === null ? 'Unlimited' : event.capacity} seats · {remainingSlots(event) === null ? 'Unlimited slots' : `${remainingSlots(event)} remaining`}</span></button>)}</div>
  </section>;
}
