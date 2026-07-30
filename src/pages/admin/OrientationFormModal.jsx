import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MapPin, Building, Clock, Users, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function OrientationFormModal({ isOpen, onClose, eventToEdit, onSaved }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: 'FREE Saturday Cruise Career Orientation',
    branch: 'Tagum',
    venue: 'Bluechef Main Training Center, Tagum City',
    description: 'Comprehensive orientation covering cruise ship career pathways, STCW requirements, and POEA agency placement.',
    date: '',
    start_time: '09:00 AM',
    end_time: '12:00 PM',
    capacity: 50,
    status: 'Published'
  });

  useEffect(() => {
    if (eventToEdit) {
      setFormData({
        title: eventToEdit.title || 'FREE Saturday Cruise Career Orientation',
        branch: eventToEdit.branch || 'Tagum',
        venue: eventToEdit.venue || '',
        description: eventToEdit.description || '',
        date: eventToEdit.date || '',
        start_time: eventToEdit.start_time || '09:00 AM',
        end_time: eventToEdit.end_time || '12:00 PM',
        capacity: eventToEdit.capacity || 50,
        status: eventToEdit.status || 'Published'
      });
    } else {
      // Set default date to next Saturday
      const today = new Date();
      const nextSat = new Date();
      nextSat.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7 || 7));
      setFormData({
        title: 'FREE Saturday Cruise Career Orientation',
        branch: 'Tagum',
        venue: 'Bluechef Main Training Center, Tagum City',
        description: 'Comprehensive orientation covering cruise ship career pathways, STCW requirements, and POEA agency placement.',
        date: nextSat.toISOString().split('T')[0],
        start_time: '09:00 AM',
        end_time: '12:00 PM',
        capacity: 50,
        status: 'Published'
      });
    }
  }, [eventToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (eventToEdit) {
        await api.updateOrientation(eventToEdit.id, formData, token);
      } else {
        await api.createOrientation(formData, token);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save orientation event.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass-panel w-full max-w-2xl p-6 sm:p-8 rounded-3xl border border-[#2670f2]/40 shadow-2xl relative my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#2670f2]/15 border border-[#2670f2]/30 flex items-center justify-center text-[#2670f2]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-luxury font-bold text-xl text-white">
                  {eventToEdit ? 'Edit Orientation Event' : 'Create Orientation Event'}
                </h3>
                <p className="text-xs text-slate-400">Set schedule, venue, capacity & status</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Title */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. FREE Saturday Cruise Career Orientation"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white focus:outline-none focus:border-[#2670f2] text-sm"
                />
              </div>

              {/* Branch */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  BGA Branch *
                </label>
                <select
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white focus:outline-none focus:border-[#2670f2] text-sm font-semibold"
                >
                  <option value="Tagum">Tagum Main Campus</option>
                  <option value="Butuan">Butuan Campus</option>
                  <option value="Pagadian">Pagadian Campus</option>
                  <option value="Bacolod">Bacolod Campus</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Publication Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white focus:outline-none focus:border-[#2670f2] text-sm font-semibold text-[#2670f2]"
                >
                  <option value="Published">Published (Public)</option>
                  <option value="Open">Open for Registration</option>
                  <option value="Closed">Closed</option>
                  <option value="Draft">Draft (Internal)</option>
                </select>
              </div>

              {/* Venue */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Venue Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="e.g. Bluechef Main Training Center, Tagum City"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white focus:outline-none focus:border-[#2670f2] text-sm"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Orientation Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white focus:outline-none focus:border-[#2670f2] text-sm"
                />
              </div>

              {/* Max Capacity */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Max Capacity (Seats) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="500"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white focus:outline-none focus:border-[#2670f2] text-sm font-semibold"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Start Time *
                </label>
                <input
                  type="text"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  placeholder="09:00 AM"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white focus:outline-none focus:border-[#2670f2] text-sm"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  End Time *
                </label>
                <input
                  type="text"
                  required
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  placeholder="12:00 PM"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white focus:outline-none focus:border-[#2670f2] text-sm"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Event Description (Optional)
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details about topics covered, speaker info, or special instructions..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white focus:outline-none focus:border-[#2670f2] text-sm"
                />
              </div>

            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl border border-slate-700 hover:bg-white/5 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-gold-gradient hover:bg-gold-gradient-hover text-slate-950 font-extrabold text-xs shadow-lg flex items-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-slate-950" />}
                <span>{eventToEdit ? 'Save Changes' : 'Publish Orientation Event'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
