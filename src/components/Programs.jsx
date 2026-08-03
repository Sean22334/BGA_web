import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, GraduationCap, ArrowRight, Info, Sparkles, Calendar } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import ProgramModal from './ProgramModal';

export default function Programs() {
  const { programs } = useContent();
  const [selectedProgram, setSelectedProgram] = useState(null);

  return (
    <section id="programs" className="relative py-24 bg-[#050D1A] overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2670f2]/10 border border-[#2670f2]/30 text-[#2670f2] text-xs font-bold uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#2670f2]" />
            <span>World-Class Curriculum</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Our Training <span className="text-gold-gradient">Programs</span>
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg font-normal leading-relaxed">
            Choose from specialized cruise career paths designed to match international hiring standards and land contracts on luxury ocean liners.
          </p>
        </div>

        {/* Program Cards Grid */}
        <div className="flex flex-wrap justify-center gap-8">
          {programs.map((program, idx) => (
            <motion.div
              key={program.id || program.program_id || idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="glass-card rounded-3xl overflow-hidden flex flex-col justify-between group w-full max-w-md"
            >
              <div>
                {/* Program Card Banner */}
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={program.image}
                    alt={program.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050D1A] via-[#050D1A]/40 to-transparent" />

                  {/* Badge */}
                  {program.badge && (
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 rounded-full bg-[#2670f2] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg">
                        {program.badge}
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-4 left-5 right-5">
                    <span className="text-[11px] text-[#2670f2] font-extrabold uppercase tracking-widest block mb-1">
                      {program.category}
                    </span>
                    <h3 className="text-xl font-bold text-white group-hover:text-[#2670f2] transition-colors">
                      {program.title}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4">
                  <p className="text-slate-300 text-sm font-normal leading-relaxed line-clamp-3">
                    {program.shortDescription || program.short_description}
                  </p>

                  <div className="space-y-2.5 pt-3 border-t border-white/10 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock className="w-4 h-4 text-[#2670f2] shrink-0" />
                      <span className="font-medium text-slate-400">Duration:</span>
                      <span className="text-white font-bold">{program.duration}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-300">
                      <GraduationCap className="w-4 h-4 text-[#2670f2] shrink-0" />
                      <span className="font-medium text-slate-400">Eligibility:</span>
                      <span className="text-white font-bold truncate">{program.eligibility}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="p-6 pt-0 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedProgram({
                    ...program,
                    shortDescription: program.shortDescription || program.short_description
                  })}
                  className="w-full py-3 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#2670f2]/40 text-slate-200 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-[#2670f2]" />
                  Learn More
                </button>

                <Link
                  to={`/reserve?program=${program.id || program.program_id}`}
                  className="btn-primary text-xs !py-3 !px-3 flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-white" />
                  <span>Reserve Slot</span>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Global CTA Banner */}
        <div className="mt-16 glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <h3 className="text-2xl font-bold text-white">
              Not sure which program fits your background?
            </h3>
            <p className="text-slate-300 text-sm mt-1 font-normal">
              Attend our free career orientation for free advice from cruise industry professionals.
            </p>
          </div>
          <Link
            to="/reserve?type=orientation"
            className="btn-primary shrink-0 text-sm !py-3.5 !px-6"
          >
            <span>Book Free Guidance Session</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>

      {/* Program Detail Modal */}
      {selectedProgram && (
        <ProgramModal
          program={selectedProgram}
          onClose={() => setSelectedProgram(null)}
        />
      )}
    </section>
  );
}
