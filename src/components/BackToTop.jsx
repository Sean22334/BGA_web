import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 left-6 z-40 p-3.5 rounded-2xl glass-panel text-[#2670f2] border border-[#2670f2]/30 hover:border-[#2670f2] hover:text-white hover:bg-[#2670f2]/20 shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300"
      title="Back to Top"
      aria-label="Scroll Back to Top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
