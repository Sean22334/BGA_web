import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Building,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Copy
} from 'lucide-react';

export default function ReservationDetailsModal({
  isOpen,
  onClose,
  reservation,
  onStatusChange
}) {
  if (!isOpen || !reservation) return null;

  const copyRefNumber = () => {
    navigator.clipboard.writeText(reservation.reference_number);
    alert(`Copied Reference Number: ${reservation.reference_number}`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass-panel w-full max-w-2xl p-6 sm:p-8 rounded-3xl border border-[#2670f2]/40 shadow-2xl relative my-8 text-left space-y-6"
        >
          {/* Top Decorative Blue Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-[#2670f2] to-blue-700" />

          {/* Modal Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-black text-[#2670f2]">
                  {reservation.reference_number}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    reservation.status === 'Confirmed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : reservation.status === 'Cancelled'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}
                >
                  {reservation.status}
                </span>
              </div>
              <h3 className="font-serif-luxury font-bold text-2xl text-white">
                {reservation.full_name}
              </h3>
              <p className="text-xs text-slate-400">
                Submitted on {reservation.created_at || 'BGA Web Portal'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 1. Applicant Personal & Contact Info Card */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-3">
            <h4 className="text-xs font-bold text-[#2670f2] uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
              <User className="w-4 h-4" /> Applicant Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Full Name:</span>
                <span className="text-white font-bold text-sm">{reservation.full_name}</span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Mobile Phone Number:</span>
                <a
                  href={`tel:${reservation.phone}`}
                  className="text-[#2670f2] font-semibold hover:underline flex items-center gap-1 mt-0.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {reservation.phone}
                </a>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 font-medium block">Email Address:</span>
                <a
                  href={`mailto:${reservation.email}`}
                  className="text-slate-200 font-medium hover:text-[#2670f2] flex items-center gap-1 truncate mt-0.5"
                >
                  <Mail className="w-3.5 h-3.5 text-[#2670f2]" />
                  {reservation.email}
                </a>
              </div>

              <div className="sm:col-span-2 pt-1 border-t border-white/5">
                <span className="text-slate-400 font-medium block">Complete Address:</span>
                <span className="text-slate-200 font-medium flex items-start gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#2670f2] shrink-0 mt-0.5" />
                  {reservation.address ? `${reservation.address}, ` : ''}{reservation.city}, {reservation.province}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Selected Orientation Schedule Details */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-3">
            <h4 className="text-xs font-bold text-[#2670f2] uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Calendar className="w-4 h-4" /> Selected Orientation Session
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <span className="text-slate-400 font-medium block">Event Title:</span>
                <span className="text-white font-bold text-sm">{reservation.orientation_title || 'FREE Saturday Cruise Career Orientation'}</span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">BGA Branch Campus:</span>
                <span className="text-white font-bold flex items-center gap-1.5 mt-0.5">
                  <Building className="w-3.5 h-3.5 text-[#2670f2]" />
                  {reservation.orientation_branch || 'Tagum'} Main Campus
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Schedule Date & Time:</span>
                <span className="text-white font-semibold flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#2670f2]" />
                  {reservation.orientation_date || 'Upcoming'} ({reservation.orientation_time || '09:00 AM'})
                </span>
              </div>

              <div className="sm:col-span-2 pt-1 border-t border-white/5">
                <span className="text-slate-400 font-medium block">Venue Address:</span>
                <span className="text-slate-200 font-medium">
                  {reservation.orientation_venue || 'Bluechef Main Training Center'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Additional Notes / Inquiries */}
          {reservation.notes && (
            <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 space-y-1 text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#2670f2]" /> Additional Notes / Inquiries:
              </span>
              <p className="text-slate-200 italic font-light pl-5">
                "{reservation.notes}"
              </p>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
            <button
              onClick={copyRefNumber}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <Copy className="w-3.5 h-3.5 text-[#2670f2]" />
              <span>Copy Reference Code</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {reservation.status !== 'Confirmed' && (
                <button
                  onClick={() => {
                    onStatusChange(reservation.id, 'Confirmed');
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Seat</span>
                </button>
              )}

              {reservation.status !== 'Cancelled' && (
                <button
                  onClick={() => {
                    onStatusChange(reservation.id, 'Cancelled');
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel Seat</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-white/5 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
