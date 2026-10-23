import React, { useState } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { useContent } from '../context/useContent';
import { contactLinks } from '../lib/cmsContent';

export default function FloatingMessenger() {
  const [open, setOpen] = useState(false);
  const { settings } = useContent();
  const links = contactLinks(settings);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      
      {/* Popover Chat Widget */}
      {open && (
        <div className="mb-4 glass-panel max-w-sm w-[90vw] p-5 rounded-3xl border border-amber-500/30 shadow-2xl animate-fadeIn space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <h4 className="font-serif-luxury font-bold text-white text-sm">BGA Admissions</h4>
                <p className="text-[11px] text-slate-400">Replies during admissions hours</p>
              </div>
            </div>
            <button 
              onClick={() => setOpen(false)}
              aria-label="Close admissions help"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 text-xs text-slate-300 space-y-2">
            <p className="font-semibold text-[#2670f2] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Mabuhay! How can we help you today?
            </p>
            <p className="text-slate-400">
              Chat directly with our admissions team on Facebook Messenger about orientation dates and course fees.
            </p>
          </div>

          <a
            href={links.messenger}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            Chat on Messenger
          </a>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="p-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-500/40 hover:scale-110 active:scale-95 transition-all duration-300 border border-white/20 relative group"
        title="Chat with Admissions"
        aria-label="Open Messenger Chat"
      >
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#050D1A] rounded-full" />
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  );
}
