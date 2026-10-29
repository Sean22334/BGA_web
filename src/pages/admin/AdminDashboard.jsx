import { remainingSlots, isBookableOrientation } from '../../../shared/reservationRules.js';
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  PlusCircle,
  TrendingUp,
  Sparkles,
  Loader2,
  ArrowUpRight,
  Building
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/useAuth';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orientations, setOrientations] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('All');



  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const branchFilter = selectedBranch === 'All' ? null : selectedBranch;
      const [oList, rList] = await Promise.all([
        api.getOrientations({ branch: branchFilter }),
        api.getReservations(token, { branch: branchFilter })
      ]);
      setOrientations(oList || []);
      setReservations(rList || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [token, selectedBranch]);

  useEffect(() => {
    fetchDashboardData();

    // Polling interval every 5 seconds for live real-time sync
    const intervalId = setInterval(() => {
      fetchDashboardData(true);
    }, 5000);

    // Event listeners for instant cross-tab & client events
    const handleSync = () => fetchDashboardData(true);
    window.addEventListener('bga_reservation_event', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('bga_reservation_event', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchDashboardData]);

  // Compute Metrics
  const totalReservations = reservations.length;
  const pendingCount = reservations.filter((r) => r.status === 'Pending').length;
  const confirmedCount = reservations.filter((r) => r.status === 'Confirmed').length;
  const cancelledCount = reservations.filter((r) => r.status === 'Cancelled').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysReservationsCount = reservations.filter((r) => r.created_at && r.created_at.includes(todayStr)).length;

  const activeEvents = orientations.filter((o) => o.status === 'Open' || o.status === 'Published');
  const upcomingCount = activeEvents.length;

  const bookableEvents = orientations.filter((event) => isBookableOrientation(event));
  const availableSlots = bookableEvents.some((event) => event.capacity === null)
    ? 'Unlimited'
    : bookableEvents.reduce((sum, event) => sum + remainingSlots(event), 0);

  const kpiCards = [
    { title: "Today's Reservations", value: todaysReservationsCount, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { title: 'Upcoming Orientations', value: upcomingCount, icon: Calendar, color: 'text-[#2670f2]', bg: 'bg-[#2670f2]/10' },
    { title: 'Active Orientation Events', value: activeEvents.length, icon: Sparkles, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Total Reservations', value: totalReservations, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { title: 'Available Slots', value: availableSlots, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Pending Requests', value: pendingCount, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { title: 'Confirmed Attendees', value: confirmedCount, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Cancelled Requests', value: cancelledCount, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' }
  ];

  return (
    <div className="space-y-8">

      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2670f2]/10 border border-[#2670f2]/30 text-[#2670f2] text-xs font-bold uppercase tracking-widest mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Admissions Overview
          </div>
          <h1 className="font-serif-luxury text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-light">
            Real-time orientation schedules, seat capacity computation, and reservation monitoring.
          </p>
        </div>

        {/* Branch Filter & Quick CTA */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <Building className="w-4 h-4 text-[#2670f2]" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All">All BGA Branches</option>
              <option value="Tagum">Tagum Campus</option>
              <option value="Butuan">Butuan Campus</option>
              <option value="Pagadian">Pagadian Campus</option>
              <option value="Bacolod">Bacolod Campus</option>
            </select>
          </div>

          <Link
            to="/admin/cms"
            className="px-4 py-2.5 rounded-xl glass-panel border border-[#2670f2]/40 hover:bg-[#2670f2]/10 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-[#2670f2]" />
            <span>Manage Content (CMS)</span>
          </Link>

          <Link
            to="/admin/orientations"
            className="px-4 py-2.5 rounded-xl bg-gold-gradient hover:bg-gold-gradient-hover text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            <span>Create Event</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#2670f2]" />
        </div>
      ) : (
        <>
          {/* 8 KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            {kpiCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2 hover:border-[#2670f2]/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 leading-tight">
                      {card.title}
                    </span>
                    <div className={`p-2 rounded-xl ${card.bg} ${card.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="font-serif-luxury text-2xl sm:text-3xl font-black text-white">
                    {card.value}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom Grid: Capacity Tracker & Recent Reservations Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left: Active Orientations Capacity Overview (col-span-6) */}
            <div className="lg:col-span-6 glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-serif-luxury font-bold text-xl text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#2670f2]" />
                    Active Orientation Capacity
                  </h3>
                  <p className="text-xs text-slate-400">Real-time remaining slots per event</p>
                </div>
                <Link to="/admin/orientations" className="text-xs text-[#2670f2] hover:underline font-semibold flex items-center gap-1">
                  View All <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-4">
                {orientations.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No orientation events found.</p>
                ) : (
                  orientations.map((event) => {
                    const percentage = event.capacity === null ? null : Math.min(100, Math.round((event.reserved / event.capacity) * 100));
                    const remaining = remainingSlots(event);

                    return (
                      <div key={event.id} className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2 text-xs">
                          <div>
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold uppercase text-[10px] mr-2">
                              {event.branch}
                            </span>
                            <span className="font-bold text-white">{event.title}</span>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>📅 {event.date}</span>
                              <span>⏰ {event.start_time}</span>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              event.status === 'Fully Booked'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {event.status}
                          </span>
                        </div>

                        {/* Capacity Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-medium text-slate-300">
                            <span>Reserved: <strong className="text-white">{event.reserved}</strong> / {event.capacity === null ? 'Unlimited' : event.capacity}</span>
                            <span>Remaining: <strong className="text-[#2670f2]">{remaining === null ? 'Unlimited slots' : `${remaining} slots`}</strong></span>
                          </div>
                          {percentage !== null && <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                percentage >= 100
                                  ? 'bg-red-500'
                                  : percentage >= 80
                                  ? 'bg-amber-400'
                                  : 'bg-[#2670f2]'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Recent Reservations Activity Feed (col-span-6) */}
            <div className="lg:col-span-6 glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-serif-luxury font-bold text-xl text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#2670f2]" />
                    Recent Reservations
                  </h3>
                  <p className="text-xs text-slate-400">Latest applicant submissions</p>
                </div>
                <Link to="/admin/reservations" className="text-xs text-[#2670f2] hover:underline font-semibold flex items-center gap-1">
                  Manage Requests <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {reservations.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No reservations recorded yet.</p>
                ) : (
                  reservations.slice(0, 5).map((res) => (
                    <div key={res.id} className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-3 hover:border-slate-700/80 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#2670f2]">{res.reference_number}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            res.status === 'Confirmed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : res.status === 'Cancelled'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {res.status}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-white truncate mt-0.5">{res.full_name}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          📞 {res.phone} • 📍 {res.city}, {res.province}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-slate-400">{res.orientation_branch || 'BGA Branch'}</div>
                        <div className="text-xs font-semibold text-slate-200 mt-0.5">{res.orientation_date || 'Upcoming'}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
