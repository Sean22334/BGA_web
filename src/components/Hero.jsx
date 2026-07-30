import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Anchor, Compass, Calendar, ArrowRight, ShieldCheck, Award, Users, MapPin } from 'lucide-react';
import { ACADEMY_STATS } from '../data/bgaData';

export default function Hero() {
  const statIcons = {
    years: Award,
    graduates: Users,
    centers: MapPin,
    partners: Anchor
  };

  return (
    <section id="hero" className="relative min-h-screen pt-28 pb-16 lg:pt-36 lg:pb-24 flex flex-col justify-between overflow-hidden">

      {/* Background Image Layer with Cinematic Gradient & Radial Glows */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/BGA LOGOOO.png"
          alt="Luxury International Cruise Ship"
          className="w-[1900px] h-[1000px] object-cover object-center scale-105 filter brightness-75 contrast-125"
        />
        {/* Navy Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050D1A] via-[#050D1A]/80 to-[#07152B]/60" />
        <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-transparent opacity-70" />
      </div>

      {/* Floating Animated Ambient Circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-12 text-center my-auto">

        {/* Small Announcement Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2670f2]/10 border border-[#2670f2]/30 text-[#2670f2] text-xs font-bold uppercase tracking-widest mb-6"
        >
          <ShieldCheck className="w-4 h-4 text-[#2670f2]" />
          <span>TESDA Accredited • International Cruise Placement</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.12] max-w-5xl mx-auto"
        >
          Crafting World-Class Careers on{' '}
          <span className="text-gold-gradient block sm:inline mt-2 sm:mt-0">
            International Cruise Ships
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-6 text-base sm:text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal"
        >
          TESDA-accredited culinary, hospitality, and maritime training programs designed to prepare aspiring seafarers for high-paying contracts on luxury ocean liners.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
        >
          <Link
            to="/reserve?type=orientation"
            className="btn-primary w-full sm:w-auto text-base !py-4 !px-8 group"
          >
            <Calendar className="w-5 h-5 text-white" />
            <span>Reserve Free Orientation</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <a
            href="#programs"
            className="btn-secondary w-full sm:w-auto text-base !py-4 !px-8 group"
          >
            <Compass className="w-5 h-5 text-[#2670f2] group-hover:rotate-45 transition-transform duration-300" />
            <span>Explore Programs</span>
          </a>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium"
        >
          <span>✓ 100% Free Career Orientation</span>
          <span className="hidden sm:inline text-slate-700">•</span>
          <span>✓ Zero Prior Experience Required</span>
          <span className="hidden sm:inline text-slate-700">•</span>
          <span>✓ POEA Manning Agency Endorsements</span>
        </motion.div>
      </div>

      {/* Embedded Floating Statistics Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-20 w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {ACADEMY_STATS.map((stat, idx) => {
            const IconComponent = statIcons[stat.id] || Award;
            return (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 + idx * 0.1 }}
                className="surface-card p-6 text-center group"
              >
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[#2670f2]/10 border border-[#2670f2]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <IconComponent className="w-5 h-5 text-[#2670f2]" />
                </div>
                <div className="font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm font-medium text-slate-400 mt-1">
                  {stat.label}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
