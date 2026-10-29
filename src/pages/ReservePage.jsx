import { remainingSlots } from '../../shared/reservationRules.js';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calendar,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  MessageCircle,
  HelpCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  X,
  Zap
} from 'lucide-react';
import { api } from '../services/api';

const BRANCH_FILTERS = ['All', 'Tagum', 'Butuan', 'Pagadian', 'Bacolod'];

function normalizeBranch(value) {
  if (!value) return 'All';
  return BRANCH_FILTERS.find((branch) => branch.toLowerCase() === value.toLowerCase()) || 'All';
}

// Zod Validation Schema
const reservationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  mobileNumber: z.string().min(10, 'Mobile number must be at least 10 digits'),
  email: z.string().email('Please enter a valid email address'),
  currentAddress: z.string().min(5, 'Complete address is required'),
  city: z.string().min(2, 'City / Municipality is required'),
  province: z.string().min(2, 'Province is required'),
  additionalNotes: z.string().optional(),
  privacyAgreed: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the Privacy Policy'
  })
});

export default function ReservePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedOrientationId = searchParams.get('orientation');
  const requestedBranch = searchParams.get('branch');

  const [orientations, setOrientations] = useState([]);
  const [loadingOrientations, setLoadingOrientations] = useState(true);
  const selectedBranchFilter = normalizeBranch(requestedBranch);
  const [reloadCount, setReloadCount] = useState(0);
  const [scheduleNotice, setScheduleNotice] = useState('');
  const dialogRef = useRef(null);

  // Booking Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [openFaq, setOpenFaq] = useState('faq-1');

  // React Hook Form initialization
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      fullName: '',
      mobileNumber: '',
      email: '',
      currentAddress: '',
      city: '',
      province: '',
      additionalNotes: '',
      privacyAgreed: false
    }
  });

  useEffect(() => {
    let active = true;
    setLoadingOrientations(true);
    setScheduleNotice('');
    setIsModalOpen(false);
    setSelectedEvent(null);
    const fetchOrientations = async () => {
      try {
        const data = await api.getPublicOrientations({
          branch: requestedOrientationId || selectedBranchFilter === 'All' ? null : selectedBranchFilter
        });
        if (!active) return;
        setOrientations((data || []).filter((event) => selectedBranchFilter === 'All' || event.branch === selectedBranchFilter));
        if (requestedOrientationId) {
          const event = (data || []).find((item) => String(item.id) === requestedOrientationId);
          if (event) {
            setSelectedEvent(event);
            setBookingError('');
            setIsModalOpen(true);
          } else {
            setScheduleNotice('That orientation is unavailable, full, closed, or already past. Please choose from the available schedules below.');
          }
        } else if (requestedBranch && selectedBranchFilter === 'All' && requestedBranch.toLowerCase() !== 'all') {
          setScheduleNotice(`"${requestedBranch}" is not a recognized BGA branch. Showing all available schedules instead.`);
        }
      } catch (err) {
        if (active) {
          setOrientations([]);
          setScheduleNotice(err.message || 'Available schedules could not be loaded. Please try again shortly.');
        }
      } finally {
        if (active) setLoadingOrientations(false);
      }
    };
    void fetchOrientations();
    return () => { active = false; };
  }, [selectedBranchFilter, requestedOrientationId, requestedBranch, reloadCount]);

  const handleBranchFilterChange = (branch) => {
    setScheduleNotice('');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('orientation');
    if (branch === 'All') nextParams.delete('branch');
    else nextParams.set('branch', branch);
    setSearchParams(nextParams);
  };

  const handleOpenBookingModal = (event) => {
    setSelectedEvent(event);
    setBookingError('');
    setIsModalOpen(true);
  };

  const handleCloseBookingModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    reset();
  }, [reset]);

  useEffect(() => {
    if (!isModalOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('input')?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape' && !isSubmitting) handleCloseBookingModal();
      if (event.key !== 'Tab') return;
      const elements = dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]');
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      previousFocus?.focus();
    };
  }, [isModalOpen, isSubmitting, handleCloseBookingModal]);

  // Form Submission
  const onSubmit = async (data) => {
    if (!selectedEvent) return;

    setIsSubmitting(true);
    setBookingError('');

    try {
      const payload = {
        orientation_id: selectedEvent.id,
        full_name: data.fullName,
        phone: data.mobileNumber,
        email: data.email,
        address: data.currentAddress,
        city: data.city,
        province: data.province,
        notes: data.additionalNotes || ''
      };

      const res = await api.submitReservation(payload);

      const generatedRef = res?.reference_number || res?.confirmation?.reference_number;
      if (!generatedRef || !(res?.confirmation?.status || res?.status)) throw new Error('The reservation response is incomplete. Please contact Admissions before submitting again.');

      const confirmation = res?.confirmation || {
        reference_number: generatedRef,
        full_name: data.fullName,
        status: res.status,
        orientation_title: selectedEvent.title,
        orientation_branch: selectedEvent.branch,
        orientation_venue: selectedEvent.venue,
        orientation_date: selectedEvent.date,
        orientation_start_time: selectedEvent.start_time,
        orientation_end_time: selectedEvent.end_time,
        submitted_at: new Date().toISOString()
      };

      try { sessionStorage.setItem(`bga_confirmation_phone:${generatedRef}`, data.mobileNumber); } catch { /* Reference + phone lookup remains available if browser storage is blocked. */ }
      setIsSubmitting(false);
      handleCloseBookingModal();

      // Redirect to Success Page
      navigate(`/success?ref=${encodeURIComponent(generatedRef)}`, {
        state: {
          confirmation
        }
      });
    } catch (err) {
      setBookingError(err.message || 'Failed to complete seat reservation.');
      setIsSubmitting(false);
    }
  };

  // Timeline steps
  const timelineSteps = [
    { num: '1', title: 'Submit reservation', desc: 'Select schedule and fill out registration form.' },
    { num: '2', title: 'Admissions review', desc: 'Admissions team verifies your seat request.' },
    { num: '3', title: 'Direct contact', desc: 'We contact you via phone, SMS, or Messenger.' },
    { num: '4', title: 'Schedule confirmed', desc: 'Your seat pass is officially locked in.' },
    { num: '5', title: 'Attend orientation', desc: 'Attend your FREE Career Orientation!' }
  ];

  const earlyBenefits = [
    'Guaranteed reservation slot in your preferred branch',
    'Priority scheduling for career evaluation',
    'Faster admission process & document checklist',
    'Dedicated assistance from BGA Admissions Officers'
  ];

  const trainingBenefits = [
    'Hands-on practical training in commercial labs',
    'Industry-standard kitchen & stateroom equipment',
    'Professional instructors with former cruise ship experience',
    'Cruise ship career & STCW preparation',
    'BGA & TESDA-aligned certificates upon completion',
    'Career guidance & interview coaching for POEA agencies'
  ];

  const bgaStats = [
    { label: 'Years Experience', value: '13+' },
    { label: 'Graduates Deployed', value: '1,000s' },
    { label: 'Training Centers', value: '4' },
    { label: 'Cruise Industry Trainers', value: '100%' }
  ];

  const faqs = [
    {
      id: 'faq-1',
      q: 'How do I know if my reservation is confirmed?',
      a: 'Your slot is automatically confirmed after a successful submission. Keep your reference number and follow the date, time, and venue shown on your confirmation page.'
    },
    {
      id: 'faq-2',
      q: 'Is the orientation really free?',
      a: 'Yes! Our Saturday Career Guidance Orientation is 100% free with no hidden charges or obligations.'
    },
    {
      id: 'faq-3',
      q: 'Can I change my reservation date?',
      a: 'Please contact our Admissions Team through the listed contact channels if you need to reschedule.'
    },
    {
      id: 'faq-4',
      q: 'What should I bring during orientation?',
      a: 'Please bring a valid ID and a notebook. If you have an updated resume or credentials, you may bring them for optional evaluation.'
    }
  ];

  return (
    <div className="min-h-screen pt-28 pb-24 bg-[#050D1A] text-slate-100 relative overflow-hidden">
      {/* Background Radial Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[#2670f2]/10 rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2670f2]/10 border border-[#2670f2]/30 text-[#2670f2] text-xs font-bold uppercase tracking-widest mb-4"
          >
            <Sparkles className="w-4 h-4 text-[#2670f2]" />
            <span>Instant Seat Reservation</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight"
          >
            Reserve Your <span className="text-gold-gradient">Slot</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-slate-300 text-base sm:text-lg font-normal leading-relaxed max-w-2xl mx-auto"
          >
            Reserve your slot for our FREE Career Orientation or Cruise Career Training Program. Submit the form to receive your confirmed slot and attendance details.
          </motion.p>
        </div>

        {/* Desktop 2-Column Grid (Left: Schedules ~60%, Right: Informative Cards ~40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

          {/* ================================================== */}
          {/* LEFT COLUMN: Available Orientations Listing (~60%) */}
          {/* ================================================== */}
          <div className="lg:col-span-7 space-y-6">

            {/* Branch Filter Tabs */}
            <div className="surface-card p-3 flex items-center justify-between gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 shrink-0 hidden sm:inline">
                Campus Filter:
              </span>
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                {BRANCH_FILTERS.map((b) => (
                  <button
                    key={b}
                    onClick={() => handleBranchFilterChange(b)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedBranchFilter === b
                        ? 'btn-primary !py-2 !px-3.5'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {b === 'All' ? 'All Campuses' : `${b}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Available Orientation Cards Container */}
            <div className="space-y-4">
              {scheduleNotice && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100" role="status">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                  <span>{scheduleNotice}</span>
                  <button type="button" onClick={() => setReloadCount((count) => count + 1)} className="underline shrink-0">Retry</button>
                </div>
              )}
              {loadingOrientations ? (
                <div className="py-16 text-center text-slate-400 surface-card">
                  <Loader2 className="w-8 h-8 animate-spin text-[#2670f2] mx-auto mb-2" />
                  <p className="text-xs">Fetching available orientation schedules...</p>
                </div>
              ) : orientations.length === 0 ? (
                <div className="p-12 text-center text-slate-400 surface-card space-y-2">
                  <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-300">No available orientation schedules for this branch currently.</p>
                </div>
              ) : (
                orientations.map((event) => {
                  const remaining = remainingSlots(event);
                  const isFull = remaining === 0 || event.status === 'Fully Booked';

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`surface-card p-6 sm:p-7 transition-all relative overflow-hidden ${
                        String(event.id) === String(requestedOrientationId) ? 'ring-2 ring-[#2670f2] shadow-2xl shadow-blue-500/20' : ''
                      } ${
                        isFull
                          ? 'opacity-80'
                          : 'hover:border-[#2670f2]/40 hover:shadow-2xl'
                      }`}
                    >
                      {/* Top Accent Badge */}
                      <div className="flex items-center justify-between gap-3 mb-4 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full bg-[#2670f2]/15 border border-[#2670f2]/30 text-[#2670f2] text-xs font-bold uppercase tracking-wider">
                            {event.branch} Campus
                          </span>
                          <span className="text-xs text-slate-400">ID #{event.id}</span>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                            isFull
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isFull ? 'FULLY BOOKED' : remaining === null ? 'UNLIMITED SLOTS' : `${remaining} SLOTS REMAINING`}
                        </span>
                      </div>

                      {/* Title & Venue */}
                      <h3 className="font-bold text-xl sm:text-2xl text-white">
                        {event.title}
                      </h3>
                      
                      <div className="mt-3 space-y-2 text-xs sm:text-sm text-slate-300">
                        <div className="flex items-center gap-2.5">
                          <MapPin className="w-4 h-4 text-[#2670f2] shrink-0" />
                          <span className="text-slate-200 font-medium">{event.venue}</span>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
                          <div className="flex items-center gap-1.5 text-white">
                            <Calendar className="w-4 h-4 text-[#2670f2]" />
                            <span>{event.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-white">
                            <Clock className="w-4 h-4 text-[#2670f2]" />
                            <span>{event.start_time} - {event.end_time}</span>
                          </div>
                        </div>
                      </div>

                      {/* Description snippet */}
                      {event.description && (
                        <p className="mt-3 text-xs text-slate-400 font-normal leading-relaxed">
                          {event.description}
                        </p>
                      )}

                      {/* Capacity Progress Bar & Action Button */}
                      <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="w-full sm:w-1/2 space-y-1">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                            <span>Seats Reserved: <strong className="text-white">{event.reserved} / {event.capacity === null ? 'Unlimited' : event.capacity}</strong></span>
                            {remaining !== null && <span>{Math.round((event.reserved / event.capacity) * 100)}%</span>}
                          </div>
                          {remaining !== null && <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-white/5">
                            <div
                              className={`h-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-[#2670f2]'}`}
                              style={{ width: `${Math.min(100, (event.reserved / event.capacity) * 100)}%` }}
                            />
                          </div>}
                        </div>

                        <button
                          disabled={isFull}
                          onClick={() => handleOpenBookingModal(event)}
                          className={`w-full sm:w-auto btn-primary text-xs !py-3 !px-6 ${
                            isFull ? 'opacity-50 cursor-not-allowed !bg-slate-800' : ''
                          }`}
                        >
                          <Zap className="w-4 h-4 text-white" />
                          <span>{isFull ? 'Session Fully Booked' : 'Book Seat Now'}</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

          </div>

          {/* ================================================== */}
          {/* RIGHT COLUMN: Informative Cards (~40%) */}
          {/* ================================================== */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">

            {/* Card 1: Why Reserve Early? */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-panel p-6 rounded-3xl border border-[#2670f2]/30 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2670f2]/15 border border-[#2670f2]/30 flex items-center justify-center text-[#2670f2]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-serif-luxury font-bold text-xl text-white">
                  Why Reserve Early?
                </h3>
              </div>

              <ul className="space-y-2.5 pt-1 text-xs sm:text-sm text-slate-300">
                {earlyBenefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#2670f2] shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Card 2: What Happens Next? (Vertical Timeline) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel p-6 rounded-3xl border border-white/10 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2670f2]/15 border border-[#2670f2]/30 flex items-center justify-center text-[#2670f2]">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-luxury font-bold text-xl text-white">
                    What Happens Next?
                  </h3>
                  <p className="text-xs text-slate-400">Simple 5-step admission journey</p>
                </div>
              </div>

              <div className="space-y-4 relative pt-2">
                {timelineSteps.map((step) => (
                  <div key={step.num} className="flex items-start gap-3.5 relative">
                    <div className="w-7 h-7 rounded-full bg-[#07152B] border-2 border-[#2670f2] text-[#2670f2] font-bold text-xs flex items-center justify-center shrink-0 z-10">
                      {step.num}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{step.title}</div>
                      <div className="text-xs text-slate-400 font-light mt-0.5">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Card 3: Training Benefits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-panel p-6 rounded-3xl border border-[#2670f2]/20 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2670f2]/15 border border-[#2670f2]/30 flex items-center justify-center text-[#2670f2]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-serif-luxury font-bold text-xl text-white">
                  Training Benefits
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1 text-xs sm:text-sm text-slate-300">
                {trainingBenefits.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#2670f2] shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Card 4: Why Choose Bluechef Global Academy? */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-panel p-6 rounded-3xl border border-white/10 shadow-xl space-y-4"
            >
              <h3 className="font-serif-luxury font-bold text-xl text-white text-center">
                Why Choose <span className="text-gold-gradient">BGA</span>?
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {bgaStats.map((stat, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 text-center space-y-1 hover:border-[#2670f2]/40 transition-colors"
                  >
                    <div className="font-serif-luxury font-black text-xl text-[#2670f2]">{stat.value}</div>
                    <div className="text-[11px] font-medium text-slate-400 leading-tight">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Card 5: FAQ Accordion */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-panel p-6 rounded-3xl border border-[#2670f2]/30 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2670f2]/15 border border-[#2670f2]/30 flex items-center justify-center text-[#2670f2]">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-luxury font-bold text-xl text-white">
                    Frequently Asked Questions
                  </h3>
                  <p className="text-xs text-slate-400">Quick answers for applicants</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {faqs.map((faq) => {
                  const isOpen = openFaq === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className="rounded-xl border border-white/10 bg-slate-950/40 overflow-hidden transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                        className="w-full p-3.5 text-left text-xs sm:text-sm font-semibold text-white flex items-center justify-between gap-2 focus:outline-none"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-[#2670f2] shrink-0 transition-transform duration-300 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="px-3.5 pb-3.5 text-xs text-slate-300 leading-relaxed font-light border-t border-white/5 pt-2"
                          >
                            {faq.a}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Card 6: Need Assistance? */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-panel p-6 rounded-3xl border border-[#2670f2]/30 shadow-xl space-y-4 bg-gradient-to-br from-[#0B1D3A] to-[#07152B]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2670f2]/20 border border-[#2670f2]/40 flex items-center justify-center text-[#2670f2]">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-luxury font-bold text-xl text-white">
                    Need Assistance?
                  </h3>
                  <p className="text-xs text-slate-300">Speak directly with Admissions</p>
                </div>
              </div>

              <div className="space-y-3 text-xs sm:text-sm pt-2">
                <div className="flex items-center gap-3 text-slate-200">
                  <Phone className="w-4 h-4 text-[#2670f2] shrink-0" />
                  <a href="tel:+639564839033" className="font-semibold hover:text-[#2670f2] transition-colors">
                    +63 956 483 9033 (Globe / Viber)
                  </a>
                </div>

                <div className="flex items-center gap-3 text-slate-200">
                  <Mail className="w-4 h-4 text-[#2670f2] shrink-0" />
                  <a href="mailto:bluechefglobalacademy@gmail.com" className="font-semibold hover:text-[#2670f2] transition-colors truncate">
                    bluechefglobalacademy@gmail.com
                  </a>
                </div>

                <div className="flex items-center gap-3 text-slate-300">
                  <Clock className="w-4 h-4 text-[#2670f2] shrink-0" />
                  <span>Mon - Sat: 8:00 AM - 5:00 PM</span>
                </div>
              </div>

              <a
                href="https://m.me/bluechefglobalacademy"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all mt-3"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat on Facebook Messenger</span>
              </a>
            </motion.div>

          </div>

        </div>

      </div>

      {/* ================================================== */}
      {/* RESERVATION FORM MODAL (Triggers when Reserve Slot is clicked) */}
      {/* ================================================== */}
      <AnimatePresence>
        {isModalOpen && selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reservation-dialog-title"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-xl p-6 sm:p-8 rounded-3xl border border-[#2670f2]/40 shadow-2xl relative my-8"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div>
                  <span className="px-2.5 py-0.5 rounded bg-[#2670f2]/20 text-[#2670f2] font-bold text-[10px] uppercase">
                    {selectedEvent.branch} Branch
                  </span>
                  <h3 id="reservation-dialog-title" className="font-serif-luxury font-bold text-xl text-white mt-1">
                    Complete Your Reservation
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedEvent.date} ({selectedEvent.start_time}) • {selectedEvent.venue}
                  </p>
                </div>
                <button
                  onClick={handleCloseBookingModal}
                  aria-label="Close reservation form"
                  disabled={isSubmitting}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {bookingError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

                {/* Full Name */}
                <div>
                  <label htmlFor="reserve-fullName" className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="reserve-fullName"
                    autoComplete="name"
                    {...register('fullName')}
                    placeholder="e.g. Juan Dela Cruz"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#2670f2] text-sm"
                  />
                  {errors.fullName && <p className="text-xs text-red-400 mt-1 font-medium">{errors.fullName.message}</p>}
                </div>

                {/* Mobile & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reserve-mobileNumber" className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      id="reserve-mobileNumber"
                    autoComplete="tel"
                    {...register('mobileNumber')}
                      placeholder="e.g. 0917 123 4567"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#2670f2] text-sm"
                    />
                    {errors.mobileNumber && <p className="text-xs text-red-400 mt-1 font-medium">{errors.mobileNumber.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="reserve-email" className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="reserve-email"
                    autoComplete="email"
                    {...register('email')}
                      placeholder="juan@gmail.com"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#2670f2] text-sm"
                    />
                    {errors.email && <p className="text-xs text-red-400 mt-1 font-medium">{errors.email.message}</p>}
                  </div>
                </div>

                {/* Complete Address */}
                <div>
                  <label htmlFor="reserve-currentAddress" className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    Complete Street Address *
                  </label>
                  <input
                    type="text"
                    id="reserve-currentAddress"
                    autoComplete="street-address"
                    {...register('currentAddress')}
                    placeholder="House / Unit No., Street, Barangay"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#2670f2] text-sm"
                  />
                  {errors.currentAddress && <p className="text-xs text-red-400 mt-1 font-medium">{errors.currentAddress.message}</p>}
                </div>

                {/* City & Province */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reserve-city" className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                      City / Municipality *
                    </label>
                    <input
                      type="text"
                      id="reserve-city"
                    autoComplete="address-level2"
                    {...register('city')}
                      placeholder="e.g. Tagum City"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#2670f2] text-sm"
                    />
                    {errors.city && <p className="text-xs text-red-400 mt-1 font-medium">{errors.city.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="reserve-province" className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                      Province *
                    </label>
                    <input
                      type="text"
                      id="reserve-province"
                    autoComplete="address-level1"
                    {...register('province')}
                      placeholder="e.g. Davao del Norte"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#2670f2] text-sm"
                    />
                    {errors.province && <p className="text-xs text-red-400 mt-1 font-medium">{errors.province.message}</p>}
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label htmlFor="reserve-additionalNotes" className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    Additional Notes / Inquiries (Optional)
                  </label>
                  <textarea
                    rows="2"
                    id="reserve-additionalNotes"
                    autoComplete="off"
                    {...register('additionalNotes')}
                    placeholder="Questions or qualifications..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#2670f2] text-sm"
                  />
                </div>

                {/* Privacy Agreement */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('privacyAgreed')}
                      className="mt-1 rounded bg-slate-950 border-slate-700 text-[#2670f2]"
                    />
                    <span className="text-xs text-slate-300 font-light">
                      I agree to the Privacy Policy and authorize BGA Admissions to contact me regarding my reservation.
                    </span>
                  </label>
                  {errors.privacyAgreed && <p className="text-xs text-red-400 mt-1 font-medium">{errors.privacyAgreed.message}</p>}
                </div>

                {/* Submit Button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-xl bg-gold-gradient hover:bg-gold-gradient-hover text-slate-950 font-extrabold text-base shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Reserving Your Seat...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-slate-950" />
                        <span>Confirm & Reserve Slot</span>
                        <ArrowRight className="w-5 h-5 text-slate-950" />
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
