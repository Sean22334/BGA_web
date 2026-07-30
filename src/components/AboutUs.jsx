import React from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, ShieldCheck, Sparkles, CheckCircle2, Building2, Anchor } from 'lucide-react';
import { PARTNER_CRUISE_LINES } from '../data/bgaData';

export default function AboutUs() {
  const whyChooseUs = [
    {
      title: 'TESDA-Aligned Curriculum',
      desc: 'Programs designed strictly according to international maritime (STCW & MLC 2006) and USPH culinary standards.',
      icon: ShieldCheck
    },
    {
      title: 'State-of-the-Art Labs',
      desc: 'Train in fully equipped commercial kitchens and mock cruise staterooms that mirror real shipboard environments.',
      icon: Building2
    },
    {
      title: 'Direct Agency Placement',
      desc: 'Exclusive recruitment endorsements with top POEA/DMW licensed manning agencies for major luxury cruise lines.',
      icon: Anchor
    },
    {
      title: 'Veteran Industry Faculty',
      desc: 'Learn directly from former cruise ship Executive Chefs, F&B Managers, and Chief Housekeepers.',
      icon: Sparkles
    }
  ];

  const fadeUp = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 }
  };

  return (
    <section id="about" className="relative py-28 lg:py-36 bg-[#050D1A] overflow-hidden">
      {/* Subtle ambient glow — restrained */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-[#2670f2]/[0.04] rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#2670f2] text-[11px] font-bold uppercase tracking-[0.2em] mb-5">
            About Bluechef Global Academy
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-black text-white tracking-tight leading-[1.1]">
            Crafting World-Class Careers On{' '}
            <span className="text-gold-gradient">The High Seas</span>
          </h2>
          <p className="mt-5 text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Bluechef Global Academy is the premier maritime hospitality and culinary training institute in the Philippines, transforming passionate individuals into high-earning global seafarers.
          </p>
        </motion.div>

        {/* Mission & Vision Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-24">
          
          {/* Mission */}
          <motion.div 
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="p-8 lg:p-10 rounded-3xl bg-[#0B1D3A]/40 border border-white/[0.06] relative overflow-hidden group hover:border-white/[0.12] transition-all duration-300"
          >
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-[#2670f2]/[0.06] rounded-full blur-3xl group-hover:bg-[#2670f2]/[0.1] transition-all duration-500" />
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-[#2670f2]/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-[#2670f2]" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">Our Mission</h3>
            </div>
            <p className="text-slate-400 leading-relaxed text-[15px] relative z-10">
              To empower Filipino youth and hospitality professionals with top-tier, international-standard culinary and maritime training, unlocking lucrative global career opportunities and elevating the standard of Filipino seafarers worldwide.
            </p>
          </motion.div>

          {/* Vision */}
          <motion.div 
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-8 lg:p-10 rounded-3xl bg-[#0B1D3A]/40 border border-white/[0.06] relative overflow-hidden group hover:border-white/[0.12] transition-all duration-300"
          >
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-blue-500/[0.06] rounded-full blur-3xl group-hover:bg-blue-500/[0.1] transition-all duration-500" />
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-[#2670f2]/10 flex items-center justify-center">
                <Eye className="w-6 h-6 text-[#2670f2]" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">Our Vision</h3>
            </div>
            <p className="text-slate-400 leading-relaxed text-[15px] relative z-10">
              To be the most recognized and trusted cruise career training brand in Southeast Asia, preferred by global cruise liners for producing disciplined, highly skilled, and compassionate maritime professionals.
            </p>
          </motion.div>
        </div>

        {/* Why Choose Bluechef Global Academy */}
        <div>
          <motion.div {...fadeUp} className="text-center mb-14">
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Why Choose <span className="text-gold-gradient">Bluechef Global Academy</span>?
            </h3>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {whyChooseUs.map((pillar, idx) => {
              const IconComp = pillar.icon;
              return (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  className="p-7 rounded-2xl bg-[#0B1D3A]/35 border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#0B1D3A]/55 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-11 h-11 rounded-xl bg-[#2670f2]/10 flex items-center justify-center mb-5 text-[#2670f2] group-hover:scale-105 transition-transform">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2 tracking-tight">
                      {pillar.title}
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-1.5 text-xs text-[#2670f2]/70 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> BGA Standard
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Industry Partners Bar — Tier 3: No container box */}
        <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }} className="mt-24 text-center">
          <h4 className="text-[11px] uppercase tracking-[0.25em] font-bold text-slate-500 mb-8">
            Trusted Placement Destinations & Partner Cruise Fleets
          </h4>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {PARTNER_CRUISE_LINES.map((partner) => (
              <span 
                key={partner}
                className="text-slate-400/80 font-bold text-sm sm:text-base tracking-wide hover:text-white transition-colors duration-300 cursor-default"
              >
                {partner}
              </span>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
}
