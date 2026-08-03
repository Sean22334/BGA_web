import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { useContent } from '../context/ContentContext';

export default function FAQ() {
  const { faqs } = useContent();
  const [openId, setOpenId] = useState(faqs.length > 0 ? (faqs[0].id || faqs[0].faq_key || 1) : null);

  const toggleFaq = (id) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="relative py-28 lg:py-36 bg-[#050D1A] overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-[#2670f2]/[0.03] rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#2670f2] text-[11px] font-bold uppercase tracking-[0.2em] mb-5">
            <HelpCircle className="w-3.5 h-3.5 text-[#2670f2]" />
            Clear Answers
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-black text-white tracking-tight leading-[1.1]">
            Frequently Asked <span className="text-gold-gradient">Questions</span>
          </h2>
          <p className="mt-5 text-slate-400 text-base sm:text-lg leading-relaxed">
            Everything you need to know about admission requirements, free orientation, training schedules, and job placement.
          </p>
        </motion.div>

        {/* Accordion Layout */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const faqId = faq.id || faq.faq_key || idx;
            const isOpen = openId === faqId;
            return (
              <motion.div
                key={faqId}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.04 }}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? 'bg-[#0B1D3A]/50 border-white/[0.1] shadow-lg shadow-black/20'
                    : 'bg-[#0B1D3A]/25 border-white/[0.05] hover:border-white/[0.1]'
                }`}
              >
                <button
                  onClick={() => toggleFaq(faqId)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="text-[15px] sm:text-lg font-bold text-white flex items-center gap-3">
                    <span className="text-[#2670f2]/60 text-sm font-mono">0{idx + 1}</span>
                    {faq.question}
                  </span>
                  <div className={`p-1.5 rounded-lg text-slate-400 transition-all duration-300 ${isOpen ? 'rotate-180 text-[#2670f2]' : ''}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-1 text-slate-400 text-[15px] leading-relaxed border-t border-white/[0.04] ml-10">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
