import React, { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Home,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  User
} from 'lucide-react';
import { api } from '../services/api';

function formatDate(value) {
  if (!value) return 'To be announced';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatSubmittedAt(value) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('en-PH');
}

function savedPhone(reference) {
  try { return sessionStorage.getItem(`bga_confirmation_phone:${reference}`) || ''; } catch { return ''; }
}

export default function SuccessPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const refFromUrl = searchParams.get('ref') || '';
  const initialConfirmation = location.state?.confirmation || null;
  const [confirmation, setConfirmation] = useState(initialConfirmation);
  const [referenceNumber, setReferenceNumber] = useState(refFromUrl || initialConfirmation?.reference_number || '');
  const [phone, setPhone] = useState(() => {
    const reference = refFromUrl || initialConfirmation?.reference_number;
    return reference ? savedPhone(reference) : '';
  });
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [copied, setCopied] = useState(false);

  const lookupConfirmation = async (reference, mobile) => {
    setLoading(true);
    setLookupError('');
    try {
      const result = await api.lookupReservationConfirmation(reference.trim(), mobile.trim());
      if (!result) {
        setLookupError('We could not verify a reservation using those details. Check the reference number and phone, then try again.');
        return;
      }
      try { sessionStorage.setItem(`bga_confirmation_phone:${result.reference_number}`, mobile.trim()); } catch { /* Manual recovery is still available. */ }
      setConfirmation(result);
      setReferenceNumber(result.reference_number);
      setSearchParams({ ref: result.reference_number }, { replace: true });
    } catch (err) {
      setLookupError(err.message || 'Confirmation lookup is temporarily unavailable. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const mobile = savedPhone(refFromUrl);
    setReferenceNumber(refFromUrl);
    setConfirmation(null);
    setPhone(mobile);
    setLookupError('');
    if (!refFromUrl || !mobile) return;
    setLoading(true);
    api.lookupReservationConfirmation(refFromUrl, mobile).then((result) => {
      if (!active) return;
      if (result) setConfirmation(result);
      else setLookupError('We could not verify a reservation using those details. Check the reference number and phone, then try again.');
    }).catch((error) => {
      if (active) setLookupError(error.message || 'Confirmation lookup is temporarily unavailable. Please try again shortly.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refFromUrl]);

  const handleLookup = (event) => {
    event.preventDefault();
    lookupConfirmation(referenceNumber, phone);
  };

  const copyRefNumber = async () => {
    try {
      await navigator.clipboard.writeText(confirmation.reference_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setLookupError('Copy is unavailable in this browser. Select and copy your reference number above.');
    }
  };

  if (!confirmation) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050D1A] px-4 pb-20 pt-28 text-slate-100">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2670f2]/10 blur-[180px]" />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="glass-panel relative z-10 w-full max-w-xl rounded-3xl border border-[#2670f2]/30 p-7 shadow-2xl sm:p-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2670f2]/30 bg-[#2670f2]/15">
            <Search className="h-7 w-7 text-[#70A6FF]" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black text-white">Retrieve Your Reservation</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">Enter the official reference number and the same phone number used during booking.</p>
          </div>

          {lookupError && <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200" role="alert">{lookupError}</div>}

          <form onSubmit={handleLookup} className="mt-7 space-y-5">
            <div>
              <label htmlFor="confirmation-reference" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Reference number</label>
              <input id="confirmation-reference" value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value.toUpperCase())} required autoComplete="off" placeholder="Your BGA reservation reference" className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 font-mono text-white outline-none transition focus:border-[#2670f2]" />
            </div>
            <div>
              <label htmlFor="confirmation-phone" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Reservation phone number</label>
              <input id="confirmation-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required autoComplete="tel" placeholder="09XX XXX XXXX" className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-[#2670f2]" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              {loading ? 'Verifying reservation...' : 'View confirmation'}
            </button>
          </form>
          <div className="mt-6 text-center"><Link to="/reserve" className="text-sm font-semibold text-[#70A6FF] hover:text-white">Return to available schedules</Link></div>
        </motion.div>
      </main>
    );
  }

  const status = confirmation.status || 'Pending';
  const statusClasses = status === 'Confirmed'
    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
    : status === 'Cancelled'
      ? 'border-red-500/40 bg-red-500/20 text-red-300'
      : 'border-amber-400/40 bg-amber-400/15 text-amber-200';

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050D1A] px-4 pb-20 pt-28 text-slate-100">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2670f2]/10 blur-[180px]" />
      <div className="relative z-10 mx-auto w-full max-w-3xl">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel relative space-y-8 overflow-hidden rounded-3xl border border-[#2670f2]/40 p-7 text-center shadow-2xl sm:p-11">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-500 via-[#2670f2] to-blue-700" />
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#2670f2]/40 bg-[#2670f2]/15 shadow-xl shadow-blue-500/20"><CheckCircle2 className="h-12 w-12 text-[#70A6FF]" /></div>

          <div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-bold uppercase tracking-wider ${statusClasses}`}><Sparkles className="h-3.5 w-3.5" />Reservation {status}</span>
            <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">Thank You, <span className="text-gold-gradient">{confirmation.full_name}</span>!</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">{status === 'Confirmed' ? 'Your slot is confirmed. Keep your reference number and arrive at the scheduled date, time, and venue.' : status === 'Cancelled' ? 'This reservation has been cancelled. Contact Admissions if you need assistance.' : 'Keep your reference number. Contact Admissions regarding this existing pending reservation.'}</p>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-3 rounded-2xl border border-[#2670f2]/40 bg-[#07152B] p-5 sm:flex-row">
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#70A6FF]">Reservation Reference Number</div>
              <div className="mt-1 break-all font-mono text-lg font-black tracking-wide text-white sm:text-xl">{confirmation.reference_number}</div>
            </div>
            <button onClick={copyRefNumber} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 p-2.5 text-xs font-semibold text-white transition hover:bg-white/20">
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-[#70A6FF]" />}{copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          {lookupError && <p role="alert" className="text-sm text-amber-200">{lookupError}</p>}
          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-6 text-left shadow-inner sm:p-8">
            <div className="flex flex-col justify-between gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white"><User className="h-4 w-4 text-[#70A6FF]" /> Orientation Summary</h2>
              <span className="text-xs text-slate-400">{formatSubmittedAt(confirmation.submitted_at)}</span>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-5 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-3"><Award className="mt-0.5 h-4 w-4 shrink-0 text-[#70A6FF]" /><div><div className="text-xs text-slate-400">Event</div><div className="font-bold text-white">{confirmation.orientation_title}</div></div></div>
              <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#70A6FF]" /><div><div className="text-xs text-slate-400">Branch & venue</div><div className="font-bold text-white">{confirmation.orientation_branch}</div><div className="mt-1 text-xs text-slate-300">{confirmation.orientation_venue}</div></div></div>
              <div className="flex items-start gap-3"><Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#70A6FF]" /><div><div className="text-xs text-slate-400">Date</div><div className="font-semibold text-white">{formatDate(confirmation.orientation_date)}</div></div></div>
              <div className="flex items-start gap-3"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#70A6FF]" /><div><div className="text-xs text-slate-400">Time</div><div className="font-semibold text-white">{confirmation.orientation_start_time} - {confirmation.orientation_end_time}</div></div></div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/" className="btn-primary w-full justify-center sm:w-auto"><Home className="h-4 w-4" /> Return Home</Link>
            <Link to="/reserve" className="btn-secondary w-full justify-center sm:w-auto"><RefreshCw className="h-4 w-4 text-[#70A6FF]" /> Reserve Another Slot</Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
