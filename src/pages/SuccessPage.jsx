import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Home, Copy, Sparkles, MapPin, Calendar, Clock, User, Phone, Mail, Award, BookOpen, RefreshCw, MessageSquare } from 'lucide-react';
import { BRANCHES } from '../data/bgaData';

export default function SuccessPage() {
  const location = useLocation();
  const state = location.state;

  if (!state || !state.reservationData) {
    return <Navigate to="/reserve" replace />;
  }

  const { refNumber, reservationData, submittedAt } = state;

  const [copied, setCopied] = React.useState(false);

  const copyRefNumber = () => {
    navigator.clipboard.writeText(refNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen pt-28 pb-24 bg-[#050D1A] text-slate-100 relative overflow-hidden flex items-center justify-center">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#2670f2]/10 rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="glass-panel p-8 sm:p-12 rounded-3xl border border-[#2670f2]/40 shadow-2xl text-center space-y-8 relative overflow-hidden"
        >
          {/* Top Decorative Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-[#2670f2] to-blue-700" />

          {/* Animated Success Checkmark */}
          <div className="relative w-24 h-24 mx-auto">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.15 }}
              className="w-full h-full rounded-full bg-gradient-to-tr from-blue-400 via-[#2670f2] to-blue-600 p-1 shadow-2xl shadow-[#2670f2]/40 flex items-center justify-center"
            >
              <div className="w-full h-full bg-[#07152B] rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-14 h-14 text-[#2670f2]" />
              </div>
            </motion.div>
          </div>

          {/* Header Title & Message */}
          <div>
            <span className="px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Reservation Successfully Received
            </span>

            <h1 className="font-serif-luxury text-3xl sm:text-4xl font-extrabold text-white mt-4 tracking-tight">
              Thank You, <span className="text-gold-gradient">{reservationData.fullName}</span>!
            </h1>

            <p className="mt-3 text-slate-300 text-sm sm:text-base font-light max-w-xl mx-auto leading-relaxed">
              Our Admissions Team will contact you shortly to confirm your reservation and seat allocation.
            </p>
          </div>

          {/* Official Reference Number Badge */}
          <div className="glass-panel-gold p-4 sm:p-5 rounded-2xl border border-[#2670f2]/40 inline-flex flex-col sm:flex-row items-center justify-center gap-3 mx-auto max-w-md w-full">
            <div className="text-center sm:text-left flex-1">
              <div className="text-[10px] uppercase font-bold text-[#2670f2] tracking-widest">
                Reservation Reference Number
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-widest mt-0.5">
                {refNumber}
              </div>
            </div>
            <button 
              onClick={copyRefNumber}
              className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer ${
                copied ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Copy Reference Code"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#2670f2]" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Submitted Information Summary Box */}
          <div className="text-left bg-slate-950/80 p-6 sm:p-8 rounded-2xl border border-white/10 space-y-4 shadow-inner">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-serif-luxury text-lg font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#2670f2]" />
                Selected Orientation Summary
              </h3>
              <span className="text-xs font-normal text-slate-400">{submittedAt}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5 text-slate-300">
                <Award className="w-4 h-4 text-[#2670f2] shrink-0" />
                <span className="text-slate-400 font-medium">Event:</span>
                <span className="text-white font-bold truncate">{reservationData.preferredProgram || 'FREE Career Orientation'}</span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-300">
                <MapPin className="w-4 h-4 text-[#2670f2] shrink-0" />
                <span className="text-slate-400 font-medium">Branch:</span>
                <span className="text-white font-bold">{reservationData.preferredBranch} Campus</span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-300">
                <Calendar className="w-4 h-4 text-[#2670f2] shrink-0" />
                <span className="text-slate-400 font-medium">Date & Time:</span>
                <span className="text-white font-semibold">{reservationData.preferredDate} ({reservationData.preferredTime})</span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-300">
                <Phone className="w-4 h-4 text-[#2670f2] shrink-0" />
                <span className="text-slate-400 font-medium">Applicant Mobile:</span>
                <span className="text-white font-semibold">{reservationData.mobileNumber}</span>
              </div>

              <div className="sm:col-span-2 flex items-start gap-2.5 text-slate-300 pt-2 border-t border-white/5">
                <Mail className="w-4 h-4 text-[#2670f2] shrink-0 mt-0.5" />
                <span className="text-slate-400 font-medium">Email:</span>
                <span className="text-white font-medium truncate">{reservationData.email}</span>
              </div>

              <div className="sm:col-span-2 flex items-start gap-2.5 text-slate-300">
                <MapPin className="w-4 h-4 text-[#2670f2] shrink-0 mt-0.5" />
                <span className="text-slate-400 font-medium">Address:</span>
                <span className="text-white font-medium">{reservationData.currentAddress}, {reservationData.city}, {reservationData.province}</span>
              </div>

              {reservationData.additionalNotes && (
                <div className="sm:col-span-2 flex items-start gap-2.5 text-slate-300 pt-1">
                  <MessageSquare className="w-4 h-4 text-[#2670f2] shrink-0 mt-0.5" />
                  <span className="text-slate-400 font-medium">Notes:</span>
                  <span className="text-slate-200 italic font-light">{reservationData.additionalNotes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gold-gradient hover:bg-gold-gradient-hover text-slate-950 font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <Home className="w-4 h-4 text-slate-950" />
              <span>Return Home</span>
            </Link>

            <Link
              to="/reserve"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-700 bg-white/5 hover:bg-white/10 hover:border-[#2670f2]/40 text-slate-200 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className="w-4 h-4 text-[#2670f2]" />
              <span>Reserve Another Slot</span>
            </Link>
          </div>

        </motion.div>

      </div>
    </div>
  );
}
