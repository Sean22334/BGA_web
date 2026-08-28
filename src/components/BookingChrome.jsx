import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react';
import { useContent } from '../context/ContentContext';

function phoneHref(value) {
  return `tel:${String(value || '').replace(/[^+\d]/g, '')}`;
}

export function BookingHeader() {
  const { settings } = useContent();
  const hotline = settings.contact_hotline || '+63 956 483 9033';
  const facebook = settings.contact_facebook || 'https://www.facebook.com/bluechefglobalacademy';

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#030914]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Bluechef Global Academy home">
          <img src="/images/BGA LOGOOO.png" alt="Bluechef Global Academy" className="h-11 w-11 shrink-0 object-contain" />
          <div className="min-w-0">
            <div className="truncate text-sm font-black tracking-wide text-white sm:text-base">BLUECHEF GLOBAL ACADEMY</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#70A6FF]">Official Reservation Portal</div>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={phoneHref(hotline)}
            className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-[#2670f2]/40 hover:text-white sm:flex"
          >
            <Phone className="h-4 w-4 text-[#2670f2]" />
            Call Admissions
          </a>
          <a
            href={facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-[#2670f2] px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-500"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Messenger Help</span>
          </a>
        </div>
      </div>
    </header>
  );
}

export function BookingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#030914] px-4 py-8 text-center text-xs text-slate-500">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <span>© {new Date().getFullYear()} Bluechef Global Academy. Official admissions portal.</span>
        <Link to="/" className="inline-flex items-center gap-2 font-semibold text-slate-300 transition hover:text-white">
          <ArrowLeft className="h-4 w-4 text-[#2670f2]" />
          Back to main website
        </Link>
      </div>
    </footer>
  );
}
