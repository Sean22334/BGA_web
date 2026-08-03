import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2, MessageSquare } from 'lucide-react';
import { FacebookIcon } from './SocialIcons';
import { useContent } from '../context/ContentContext';

export default function Contact() {
  const { settings } = useContent();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    branch: 'Tagum',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', phone: '', branch: 'Tagum', message: '' });
    }, 4000);
  };

  return (
    <section id="contact" className="relative py-24 bg-[#071325] overflow-hidden border-t border-slate-800/80">
      {/* Background Ambient */}
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2670f2]/10 border border-[#2670f2]/30 text-[#2670f2] text-xs font-semibold uppercase tracking-widest mb-3">
            <MessageSquare className="w-3.5 h-3.5 text-[#2670f2]" />
            Connect With BGA
          </div>
          <h2 className="font-serif-luxury text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Contact Our <span className="text-gold-gradient">Admissions Team</span>
          </h2>
          <p className="mt-4 text-slate-300 text-base sm:text-lg font-light leading-relaxed">
            Have questions regarding tuition, orientation dates, or admission qualifications? Send us a message or call our hotlines directly.
          </p>
        </div>

        {/* 2-Column Contact Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Contact Info & Channels */}
          <div className="lg:col-span-5 space-y-6">

            {/* Quick Contact Box */}
            <div className="glass-panel p-8 rounded-3xl border border-[#2670f2]/20 space-y-6">
              <h3 className="font-serif-luxury text-2xl font-bold text-white mb-6">
                Headquarters Hotline
              </h3>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#2670f2]/10 border border-[#2670f2]/30 flex items-center justify-center text-[#2670f2] shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Phone Hotlines</div>
                  <a href={`tel:${settings.contact_hotline || '+63 956 483 9033'}`} className="text-white font-semibold hover:text-[#2670f2] transition-colors block mt-0.5">
                    {settings.contact_hotline || '+63 956 483 9033 (Globe)'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#2670f2]/10 border border-[#2670f2]/30 flex items-center justify-center text-[#2670f2] shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Email Inquiry</div>
                  <a href={`mailto:${settings.contact_email || 'bluechefglobalacademy@gmail.com'}`} className="text-white font-semibold hover:text-[#2670f2] transition-colors block mt-0.5">
                    {settings.contact_email || 'bluechefglobalacademy@gmail.com'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#2670f2]/10 border border-[#2670f2]/30 flex items-center justify-center text-[#2670f2] shrink-0">
                  <FacebookIcon className="w-5 h-5 text-[#2670f2]" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Official Facebook Page</div>
                  <a
                    href={settings.contact_facebook || 'https://www.facebook.com/bluechefglobalacademy'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2670f2] font-bold hover:underline block mt-0.5 text-sm"
                  >
                    {settings.contact_facebook || 'https://www.facebook.com/bluechefglobalacademy'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#2670f2]/10 border border-[#2670f2]/30 flex items-center justify-center text-[#2670f2] shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Business Hours</div>
                  <div className="text-white font-medium text-sm mt-0.5">
                    {settings.contact_hours || 'Monday - Saturday: 8:00 AM - 5:00 PM'}
                  </div>
                  <div className="text-slate-400 text-xs">Closed on Sundays & National Holidays</div>
                </div>
              </div>
            </div>

            {/* Google Maps Preview Banner */}
            <div className="glass-panel p-4 rounded-3xl border border-white/10 overflow-hidden relative group">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2670f2] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> BGA Main Campus Map
                </span>
                <span className="text-[11px] text-slate-400">Tagum City, Philippines</span>
              </div>
              <div className="h-44 rounded-2xl overflow-hidden relative">
                <iframe
                  title="Bluechef Global Academy Tagum Location Map"
                  src={settings.contact_map_url || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1144.6745001914448!2d125.80265620350177!3d7.448243878904475!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32f9531262cc8317%3A0x16fdd36a831bf336!2sLacor%20Building%2C%20Bonifacio%20St%2C%20Tagum%2C%20Davao%20del%20Norte!5e1!3m2!1sen!2sph!4v1784871359698!5m2!1sen!2sph'}
                  className="w-full h-full border-0 filter brightness-90 contrast-125"
                  loading="lazy"
                />
              </div>
            </div>

          </div>

          {/* Interactive Contact Form */}
          <div className="lg:col-span-7">
            <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-[#2670f2]/20 shadow-2xl relative">
              <h3 className="font-serif-luxury text-2xl font-bold text-white mb-2">
                Send Us a Direct Message
              </h3>
              <p className="text-slate-300 text-sm font-light mb-8">
                Fill out the form below.
              </p>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3"
                >
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="font-serif-luxury text-xl font-bold text-white">Message Sent Successfully!</h4>
                  <p className="text-slate-300 text-sm">
                    Thank you for contacting Bluechef Global Academy. Our team will get back to you shortly.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Juan Dela Cruz"
                        className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#2670f2] transition-colors text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="0917 123 4567"
                        className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#2670f2] transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="juan@example.com"
                        className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#2670f2] transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Your Message / Inquiry *
                    </label>
                    <textarea
                      rows="4"
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Ask us about orientation dates, enrollment requirements, or course fees..."
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#2670f2] transition-colors text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl bg-gold-gradient hover:bg-gold-gradient-hover text-slate-950 font-extrabold text-base shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-all cursor-pointer"
                  >
                    <Send className="w-5 h-5 text-slate-950" />
                    Submit Inquiry
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
