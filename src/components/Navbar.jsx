import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Anchor, ChefHat, Menu, X, ChevronRight, Sparkles, Phone, Calendar } from 'lucide-react';
import { useContent } from '../context/ContentContext';

export default function Navbar() {
  const { settings } = useContent();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '/#hero' },
    { name: 'About Us', href: '/#about' },
    { name: 'Programs', href: '/#programs' },
    { name: 'Training Centers', href: '/#centers' },
    { name: 'Gallery', href: '/#gallery' },
    { name: 'Testimonials', href: '/#testimonials' },
    { name: 'FAQ', href: '/#faq' },
    { name: 'Contact', href: '/#contact' },
  ];

  const handleNavClick = (href) => {
    setMobileMenuOpen(false);
    if (href.startsWith('/#') && location.pathname === '/') {
      const id = href.replace('/#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">

      {/* Main Glass Navbar */}
      <nav
        className={`transition-all duration-300 ${
          scrolled
            ? 'glass-panel py-3 shadow-2xl bg-[#030914]/90 border-b border-white/10'
            : 'bg-gradient-to-b from-[#030914]/95 via-[#030914]/60 to-transparent py-4.5 border-b border-white/5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">

          {/* Academy Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img
              src="/images/BGA LOGOOO.png"
              alt="Bluechef Global Academy Logo"
              className="w-11 h-11 object-contain group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="font-bold text-lg md:text-xl tracking-tight text-white flex items-center gap-1.5 leading-none">
                BLUECHEF <span className="text-[#2670f2] font-semibold text-xs tracking-widest uppercase">GLOBAL</span>
              </span>
              <span className="text-[10px] tracking-[0.2em] text-slate-400 uppercase font-semibold leading-tight mt-0.5">
                Academy • Philippines
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => {
                  if (location.pathname === '/') {
                    e.preventDefault();
                    handleNavClick(link.href);
                  }
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <a
              href={`tel:${settings.contact_hotline || '+639564839033'}`}
              className="p-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-[#2670f2] hover:border-[#2670f2]/40 hover:bg-white/5 transition-all"
              title={`Call Admissions Hotline: ${settings.contact_hotline || '+63 956 483 9033'}`}
            >
              <Phone className="w-4 h-4" />
            </a>

            <Link
              to="/reserve"
              className="btn-primary text-xs !py-2.5 !px-5 shadow-lg shadow-blue-500/20"
            >
              <Calendar className="w-4 h-4" />
              <span>Reserve Free Slot</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-xl border border-slate-800 bg-[#0B1D3A]/80 text-slate-200 hover:text-white focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-[#2670f2]" /> : <Menu className="w-6 h-6 text-slate-200" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden glass-panel border-b border-[#2670f2]/20 px-4 pt-4 pb-6 mt-2 mx-3 rounded-2xl animate-fadeIn space-y-3">
            <div className="grid grid-cols-1 gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => {
                    if (location.pathname === '/') {
                      e.preventDefault();
                      handleNavClick(link.href);
                    } else {
                      setMobileMenuOpen(false);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl text-base font-medium text-slate-200 hover:text-[#2670f2] hover:bg-[#2670f2]/10 flex items-center justify-between"
                >
                  {link.name}
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </a>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
              <Link
                to="/reserve"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 px-4 rounded-xl bg-gold-gradient text-slate-950 font-bold text-base shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                Reserve Your Free Slot
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
