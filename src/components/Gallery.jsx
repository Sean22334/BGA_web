import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Maximize2, Sparkles } from 'lucide-react';
import { GALLERY_ITEMS } from '../data/bgaData';

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [lightboxImage, setLightboxImage] = useState(null);

  const categories = ['All', 'Training', 'Kitchen Lab', 'Orientation', 'Graduation', 'Student Activities'];

  const filteredItems = activeCategory === 'All'
    ? GALLERY_ITEMS
    : GALLERY_ITEMS.filter(item => item.category === activeCategory);

  return (
    <section id="gallery" className="relative py-24 bg-[#050D1A] overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2670f2]/10 border border-[#2670f2]/30 text-[#2670f2] text-xs font-semibold uppercase tracking-widest mb-3">
            <Camera className="w-3.5 h-3.5 text-[#2670f2]" />
            Academy Life & Facilities
          </div>
          <h2 className="font-serif-luxury text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Campus <span className="text-gold-gradient">Gallery</span>
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg font-light leading-relaxed">
            Take a visual tour of our culinary laboratories, orientation sessions, student activities, and graduation ceremonies.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                activeCategory === cat
                  ? 'bg-gold-gradient text-slate-950 shadow-lg shadow-[#2670f2]/20'
                  : 'glass-panel text-slate-300 hover:text-white hover:border-[#2670f2]/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Photo Grid */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                key={item.id}
                onClick={() => setLightboxImage(item)}
                className="group relative h-64 rounded-2xl overflow-hidden glass-card cursor-pointer border border-white/10"
              >
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#07152B] via-[#07152B]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-between">
                  <div className="flex justify-end">
                    <div className="p-2 rounded-full bg-slate-950/80 text-[#2670f2] border border-[#2670f2]/30">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2670f2] block mb-1">
                      {item.category}
                    </span>
                    <h4 className="font-serif-luxury font-bold text-white text-base">
                      {item.title}
                    </h4>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl w-full rounded-3xl overflow-hidden glass-panel border border-[#2670f2]/40 shadow-2xl p-2">
            <button 
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-slate-950/80 text-white hover:text-[#2670f2] border border-white/20 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={lightboxImage.image} 
              alt={lightboxImage.title} 
              className="w-full h-[70vh] object-contain rounded-2xl bg-black/40"
            />
            <div className="p-4 text-center">
              <span className="text-xs uppercase font-bold text-[#2670f2] tracking-widest block">
                {lightboxImage.category}
              </span>
              <h3 className="font-serif-luxury text-xl font-bold text-white mt-1">
                {lightboxImage.title}
              </h3>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
