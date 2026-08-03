import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowUpRight } from 'lucide-react';
import { FacebookIcon } from './SocialIcons';
import { useContent } from '../context/ContentContext';

export default function Footer() {
  const { settings, programs, branches } = useContent();

  return (
    <footer className="bg-[#030914] text-slate-400 pt-20 pb-12 relative overflow-hidden">

      {/* Top subtle accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-10 pb-14 border-b border-white/[0.05]">

          {/* Col 1: Brand Info */}
          <div className="lg:col-span-2 space-y-5">
            <Link to="/" className="flex items-center gap-3 inline-block">
              <img
                src="/images/BGA LOGOOO.png"
                alt="Bluechef Global Academy Logo"
                className="w-10 h-10 object-contain filter drop-shadow-[0_4px_10px_rgba(38,112,242,0.25)]"
              />

              <div className="flex flex-col">
                <span className="font-black text-lg tracking-wider text-white leading-none">
                  BLUECHEF <span className="text-[#2670f2] font-light text-xs tracking-widest">GLOBAL</span>
                </span>
                <span className="text-[10px] tracking-[0.25em] text-slate-500 uppercase font-semibold">
                  Academy • Philippines
                </span>
              </div>
            </Link>

            <p className="text-sm leading-relaxed text-slate-500 max-w-sm">
              {settings.footer_tagline || 'The premier cruise career training academy in the Philippines. Preparing world-class seafarers, chefs, and hospitality staff for luxury international ocean liners.'}
            </p>

            <div className="pt-1 flex items-center gap-2">
              <a
                href={settings.contact_facebook || 'https://www.facebook.com/bluechefglobalacademy'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/[0.04] hover:bg-[#2670f2]/15 border border-white/[0.06] hover:border-[#2670f2]/30 text-slate-400 hover:text-[#2670f2] flex items-center justify-center transition-all duration-200"
                aria-label="Facebook"
              >
                <FacebookIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-4">
            <h4 className="font-bold text-white text-sm tracking-wider uppercase">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="/#hero" className="hover:text-white transition-colors duration-200">Home</a></li>
              <li><a href="/#about" className="hover:text-white transition-colors duration-200">About Us</a></li>
              <li><a href="/#programs" className="hover:text-white transition-colors duration-200">Training Programs</a></li>
              <li><a href="/#centers" className="hover:text-white transition-colors duration-200">Training Centers</a></li>
              <li><a href="/#gallery" className="hover:text-white transition-colors duration-200">Campus Gallery</a></li>
              <li><a href="/#testimonials" className="hover:text-white transition-colors duration-200">Graduate Stories</a></li>
              <li><a href="/#faq" className="hover:text-white transition-colors duration-200">FAQ</a></li>
              <li>
                <Link to="/reserve" className="text-[#2670f2] font-semibold hover:text-[#2670f2]/80 transition-colors flex items-center gap-1">
                  Reserve Slot <ArrowUpRight className="w-3.5 h-3.5 inline" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Programs */}
          <div className="space-y-4">
            <h4 className="font-bold text-white text-sm tracking-wider uppercase">
              Programs
            </h4>
            <ul className="space-y-2.5 text-sm">
              {programs.map((prog, idx) => (
                <li key={prog.id || prog.program_id || idx}>
                  <Link to={`/reserve?program=${prog.id || prog.program_id}`} className="hover:text-white transition-colors duration-200 block truncate max-w-[200px]">
                    {prog.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Training Branches */}
          <div className="space-y-4">
            <h4 className="font-bold text-white text-sm tracking-wider uppercase">
              Branches
            </h4>
            <ul className="space-y-2.5 text-sm">
              {branches.map((b, idx) => (
                <li key={b.id || b.branch_key || idx}>
                  <Link to={`/reserve?branch=${b.id || b.branch_key}`} className="hover:text-white transition-colors duration-200 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#2670f2]/60 shrink-0" />
                    <span>{b.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom Credits & Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div>
            {settings.footer_copyright || `© ${new Date().getFullYear()} Bluechef Global Academy. All rights reserved.`}
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 transition-colors cursor-pointer">Terms of Service</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
