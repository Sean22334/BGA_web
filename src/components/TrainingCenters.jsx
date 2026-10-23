import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock, ExternalLink, Calendar, CheckCircle } from 'lucide-react';
import { useContent } from '../context/useContent';

export default function TrainingCenters() {
  const { branches } = useContent();

  return (
    <section id="centers" className="relative py-24 bg-[#071325] overflow-hidden border-t border-slate-800/80">
      {/* Background Decorative Ambient */}
      <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2670f2]/10 border border-[#2670f2]/30 text-[#2670f2] text-xs font-semibold uppercase tracking-widest mb-3">
            Nationwide Presence
          </div>
          <h2 className="font-serif-luxury text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Our Training <span className="text-gold-gradient">Centers</span>
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg font-light leading-relaxed">
            Visit our state-of-the-art training facilities located strategically across Mindanao and Visayas.
          </p>
        </div>

        {/* Branch Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {branches.map((branch, idx) => {
            const features = Array.isArray(branch.features) ? branch.features : [];

            return (
              <motion.div
                key={branch.id || branch.branch_key || idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#2670f2]/20 hover:border-[#2670f2]/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Branch Header */}
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                      <span className="text-xs uppercase tracking-widest text-[#2670f2] font-bold block mb-1">
                        BGA Campus
                      </span>
                      <h3 className="font-serif-luxury text-2xl font-bold text-white group-hover:text-[#2670f2] transition-colors">
                        {branch.name}
                      </h3>
                    </div>

                    {branch.mapUrl || branch.map_url ? (
                      <a
                        href={branch.mapUrl || branch.map_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-[#2670f2]/20 border border-white/10 text-[#2670f2] hover:text-[#2670f2] transition-all flex items-center gap-1 text-xs font-semibold shrink-0"
                        title="Open in Google Maps"
                      >
                        <MapPin className="w-4 h-4" />
                        <span className="hidden sm:inline">Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : null}
                  </div>

                  {/* Branch Image Preview */}
                  <div className="relative h-44 rounded-2xl overflow-hidden mb-6 border border-white/10">
                    <img 
                      src={branch.image} 
                      alt={branch.name} 
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07152B] via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
                      {features.map((feat, fIdx) => (
                        <span key={fIdx} className="px-2.5 py-0.5 rounded-md bg-slate-950/80 border border-white/10 text-[11px] text-slate-300 font-medium">
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Details List */}
                  <div className="space-y-3.5 text-sm">
                    <div className="flex items-start gap-3 text-slate-300">
                      <MapPin className="w-5 h-5 text-[#2670f2] shrink-0 mt-0.5" />
                      <span>{branch.address}</span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-300">
                      <Phone className="w-5 h-5 text-[#2670f2] shrink-0" />
                      <a href={`tel:${branch.phone.split('/')[0].trim()}`} className="hover:text-[#2670f2] transition-colors">
                        {branch.phone}
                      </a>
                    </div>

                    <div className="flex items-center gap-3 text-slate-300">
                      <Mail className="w-5 h-5 text-[#2670f2] shrink-0" />
                      <a href={`mailto:${branch.email}`} className="hover:text-[#2670f2] transition-colors">
                        {branch.email}
                      </a>
                    </div>

                    <div className="flex items-center gap-3 text-slate-300">
                      <Clock className="w-5 h-5 text-[#2670f2] shrink-0" />
                      <span>{branch.hours}</span>
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle className="w-4 h-4" /> Open for In-Person Counseling
                  </div>

                  <Link
                    to={`/reserve?branch=${branch.id || branch.branch_key}`}
                    className="px-5 py-2.5 rounded-xl bg-gold-gradient hover:bg-gold-gradient-hover text-slate-950 font-bold text-xs shadow-lg flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-slate-950" />
                    Select Branch & Reserve
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
