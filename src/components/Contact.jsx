import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, MessageSquare, ArrowRight } from 'lucide-react';
import { FacebookIcon } from './SocialIcons';
import { useContent } from '../context/useContent';
import { contactLinks } from '../lib/cmsContent';

export default function Contact() {
  const { settings } = useContent();
  const links = contactLinks(settings);

  return (
    <section id="contact" className="relative py-24 bg-[#071325] border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2670f2]/10 border border-[#2670f2]/30 text-[#70a6ff] text-xs font-semibold uppercase tracking-widest mb-3">
            <MessageSquare className="w-3.5 h-3.5" /> Connect With BGA
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Contact Our <span className="text-gold-gradient">Admissions Team</span>
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg leading-relaxed">
            Ask about tuition, orientation dates, or admission requirements through our official contact channels.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#2670f2]/20 space-y-6">
            <h3 className="text-2xl font-bold text-white">Admissions contact details</h3>
            <div className="flex items-start gap-4">
              <Phone className="w-5 h-5 text-[#70a6ff] shrink-0 mt-1" />
              <div><p className="text-xs text-slate-400 uppercase">Phone hotline</p><a href={links.telephone} className="text-white font-semibold hover:underline">{links.phone}</a></div>
            </div>
            <div className="flex items-start gap-4">
              <Mail className="w-5 h-5 text-[#70a6ff] shrink-0 mt-1" />
              <div className="min-w-0"><p className="text-xs text-slate-400 uppercase">Email inquiry</p><a href={links.mail} className="text-white font-semibold hover:underline break-words">{links.email}</a></div>
            </div>
            <div className="flex items-start gap-4">
              <FacebookIcon className="w-5 h-5 text-[#70a6ff] shrink-0 mt-1" />
              <div><p className="text-xs text-slate-400 uppercase">Official Facebook page</p><a href={links.facebook} target="_blank" rel="noopener noreferrer" className="text-[#70a6ff] font-semibold hover:underline">Bluechef Global Academy</a></div>
            </div>
            <div className="flex items-start gap-4">
              <Clock className="w-5 h-5 text-[#70a6ff] shrink-0 mt-1" />
              <div><p className="text-xs text-slate-400 uppercase">Business hours</p><p className="text-white text-sm">{settings.contact_hours || 'Monday - Saturday: 8:00 AM - 5:00 PM'}</p></div>
            </div>
            {settings.contact_map_url && (
              <div className="pt-3">
                <p className="flex items-center gap-2 text-xs text-slate-300 mb-3"><MapPin className="w-4 h-4" /> BGA Main Campus, Tagum City</p>
                <iframe title="Bluechef Global Academy Tagum Location Map" src={settings.contact_map_url} className="w-full h-48 rounded-2xl border-0" loading="lazy" />
              </div>
            )}
          </div>

          <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-[#2670f2]/20 space-y-6">
            <h3 className="text-2xl font-bold text-white">Message admissions directly</h3>
            <p className="text-slate-300 leading-relaxed">Open Messenger to chat with our team, or use your email app to send an inquiry. Our team responds during admissions hours.</p>
            <a href={links.messenger} target="_blank" rel="noopener noreferrer" className="w-full px-5 py-4 rounded-xl bg-[#2670f2] hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2">
              <MessageSquare className="w-5 h-5" /> Chat on Messenger
            </a>
            <a href={links.mail} className="w-full px-5 py-4 rounded-xl border border-slate-600 hover:border-[#2670f2] text-white font-bold flex items-center justify-center gap-2">
              <Mail className="w-5 h-5" /> Open email app
            </a>
            <div className="border-t border-white/10 pt-6">
              <h4 className="font-bold text-white mb-2">Ready for a free orientation?</h4>
              <p className="text-sm text-slate-300 mb-4">View available schedules and reserve your slot online.</p>
              <Link to="/reserve" className="inline-flex items-center gap-2 font-semibold text-[#70a6ff] hover:underline">See orientation schedules <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
