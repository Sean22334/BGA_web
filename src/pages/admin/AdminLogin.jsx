import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, ShieldCheck, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginAdmin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/admin/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.loginAdmin(email, password);
      loginAdmin(data.admin, data.token);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030914] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Radial Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#2670f2]/10 rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">

        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group mb-4">
            <img
              src="/images/BGA LOGOOO.png"
              alt="Bluechef Global Academy Logo"
              className="w-12 h-12 object-contain filter drop-shadow-[0_4px_10px_rgba(38,112,242,0.4)] group-hover:scale-105 transition-transform"
            />
            <div className="text-left">
              <span className="font-serif-luxury font-black text-xl tracking-wider text-white block leading-none">
                BLUECHEF <span className="text-[#2670f2] font-light text-sm tracking-widest">GLOBAL</span>
              </span>
              <span className="text-[10px] tracking-[0.25em] text-slate-400 uppercase font-semibold">
                Admissions Portal
              </span>
            </div>
          </Link>
          <h2 className="font-serif-luxury text-2xl font-bold text-white mt-2">
            Admissions Admin Login
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Orientation & Reservation Management System
          </p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 rounded-3xl border border-[#2670f2]/30 shadow-2xl space-y-6"
        >
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Admin Email *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#2670f2] focus:ring-1 focus:ring-[#2670f2]/50 text-sm transition-all"
                />
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password *
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#2670f2] focus:ring-1 focus:ring-[#2670f2]/50 text-sm transition-all"
                />
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded bg-slate-900 border-slate-700 text-[#2670f2]" />
                <span>Remember session</span>
              </label>
              <span className="hover:text-[#2670f2] cursor-pointer transition-colors">Forgot Password?</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gold-gradient hover:bg-gold-gradient-hover text-slate-950 font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-slate-950" />
                  <span>Authenticate & Access Portal</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </>
              )}
            </button>
          </form>
        </motion.div>

      </div>
    </div>
  );
}
