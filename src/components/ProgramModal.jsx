import React from 'react';
import { Link } from 'react-router-dom';
import { X, Clock, GraduationCap, CheckCircle2, Calendar, ArrowRight } from 'lucide-react';

export default function ProgramModal({ program, onClose }) {
  if (!program) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="glass-panel max-w-2xl w-full rounded-3xl border border-amber-500/30 overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Banner */}
        <div className="relative h-48 sm:h-56 w-full">
          <img 
            src={program.image} 
            alt={program.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07152B] via-[#07152B]/60 to-transparent" />
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/70 text-slate-300 hover:text-white hover:bg-amber-500/20 border border-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-6 right-6">
            <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider">
              {program.badge}
            </span>
            <h3 className="font-serif-luxury text-2xl sm:text-3xl font-extrabold text-white mt-2">
              {program.title}
            </h3>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#2670f2] shrink-0" />
              <div>
                <div className="text-xs text-slate-400 font-medium">Program Duration</div>
                <div className="text-sm font-semibold text-white">{program.duration}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5 text-[#2670f2] shrink-0" />
              <div>
                <div className="text-xs text-slate-400 font-medium">Eligibility</div>
                <div className="text-sm font-semibold text-white">{program.eligibility}</div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm uppercase font-bold text-[#2670f2] tracking-wider mb-2">
              Program Overview
            </h4>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-light">
              {program.overview}
            </p>
          </div>

          <div>
            <h4 className="text-sm uppercase font-bold text-[#2670f2] tracking-wider mb-3">
              Key Training Modules & Benefits
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {program.highlights.map((highlight, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-[#2670f2] shrink-0 mt-0.5" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer CTAs */}
        <div className="p-6 border-t border-slate-800 bg-[#050D1A] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            * Limited slots per branch location. Early reservation recommended.
          </div>
          <Link
            to={`/reserve?program=${program.id}`}
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gold-gradient hover:bg-gold-gradient-hover text-slate-950 font-bold text-sm shadow-xl flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Reserve Slot For This Program
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
