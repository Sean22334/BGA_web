import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, ChevronLeft, ChevronRight, Star, Anchor } from 'lucide-react';
import { TESTIMONIALS } from '../data/bgaData';

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  const current = TESTIMONIALS[currentIndex];

  return (
    <section id="testimonials" className="relative py-28 lg:py-36 bg-[#050D1A] overflow-hidden">
      {/* Subtle watermark */}
      <Anchor className="absolute right-10 bottom-10 w-80 h-80 text-white/[0.015] pointer-events-none transform rotate-12" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#2670f2] text-[11px] font-bold uppercase tracking-[0.2em] mb-5">
            Graduate Success Stories
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-black text-white tracking-tight leading-[1.1]">
            Hear From Our <span className="text-gold-gradient">Seafarers</span>
          </h2>
          <p className="mt-5 text-slate-400 text-base sm:text-lg leading-relaxed">
            Real stories from Bluechef Global Academy alumni now sailing with premier international cruise lines worldwide.
          </p>
        </motion.div>

        {/* Testimonial Carousel Card */}
        <div className="max-w-4xl mx-auto">
          <div className="p-8 sm:p-12 lg:p-14 rounded-3xl bg-[#0B1D3A]/40 border border-white/[0.06] relative">
            
            <Quote className="absolute top-8 left-8 w-14 h-14 text-[#2670f2]/[0.08] pointer-events-none" />

            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col md:flex-row items-center gap-8 relative z-10"
              >
                {/* Avatar Column */}
                <div className="shrink-0 text-center">
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-[3px] bg-gradient-to-tr from-[#2670f2]/60 to-blue-400/40 mx-auto">
                    <img 
                      src={current.avatar} 
                      alt={current.name} 
                      className="w-full h-full object-cover rounded-full border-2 border-[#0B1D3A]"
                    />
                  </div>
                  <span className="inline-block mt-3 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#2670f2] text-[10px] font-bold uppercase tracking-wider">
                    {current.branch}
                  </span>
                </div>

                {/* Content Column */}
                <div className="flex-1 text-center md:text-left space-y-5">
                  <div className="flex items-center justify-center md:justify-start gap-1 text-[#2670f2]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-[#2670f2] text-[#2670f2]" />
                    ))}
                  </div>

                  <p className="text-slate-300 text-lg sm:text-xl leading-relaxed italic">
                    "{current.quote}"
                  </p>

                  <div>
                    <h4 className="font-bold text-xl text-white tracking-tight">
                      {current.name}
                    </h4>
                    <div className="text-sm text-slate-400 mt-0.5">
                      <span className="text-[#2670f2] font-semibold">{current.role}</span>
                      {' '}• {current.company}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                {TESTIMONIALS.map((t, idx) => (
                  <button
                    key={t.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentIndex ? 'w-8 bg-[#2670f2]' : 'w-2 bg-slate-700 hover:bg-slate-500'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white transition-all"
                  aria-label="Previous Testimonial"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white transition-all"
                  aria-label="Next Testimonial"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
