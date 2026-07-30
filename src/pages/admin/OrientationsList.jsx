import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  PlusCircle,
  Search,
  Copy,
  Edit,
  Trash2,
  Lock,
  Eye,
  CheckCircle2,
  Building,
  Loader2,
  Sparkles,
  AlertTriangle,
  Users
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import OrientationFormModal from './OrientationFormModal';

import ConfirmModal from '../../components/ConfirmModal';

export default function OrientationsList() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [orientations, setOrientations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);

  // Custom Confirmation Popup State
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    variant: 'danger',
    loading: false,
    onConfirm: null
  });

  useEffect(() => {
    fetchOrientations();
  }, [token, selectedBranch, selectedStatus, search]);

  const fetchOrientations = async () => {
    setLoading(true);
    try {
      const data = await api.getOrientations({
        branch: selectedBranch === 'All' ? null : selectedBranch,
        status: selectedStatus === 'All' ? null : selectedStatus,
        search
      });
      setOrientations(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Actions
  const handleOpenCreateModal = () => {
    setEventToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (event) => {
    setEventToEdit(event);
    setModalOpen(true);
  };

  const handleDuplicate = (id) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Duplicate Orientation Event',
      message: 'Are you sure you want to duplicate this orientation event? A new draft copy will be created.',
      confirmText: 'Duplicate Event',
      variant: 'info',
      loading: false,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, loading: true }));
        try {
          await api.duplicateOrientation(id, token);
          fetchOrientations();
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      }
    });
  };

  const handleToggleClose = (id, currentStatus) => {
    const newStatus = currentStatus === 'Closed' ? 'Open' : 'Closed';
    setConfirmConfig({
      isOpen: true,
      title: `${newStatus === 'Closed' ? 'Close' : 'Reopen'} Registration`,
      message: `Are you sure you want to change registration status to ${newStatus}?`,
      confirmText: `${newStatus === 'Closed' ? 'Close' : 'Reopen'} Event`,
      variant: newStatus === 'Closed' ? 'warning' : 'info',
      loading: false,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, loading: true }));
        try {
          await api.updateOrientationStatus(id, newStatus, token);
          fetchOrientations();
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      }
    });
  };

  const handleDelete = (id) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Orientation Event',
      message: 'Are you sure you want to delete this orientation event? All associated reservations will be deleted.',
      confirmText: 'Yes, Delete Event',
      variant: 'danger',
      loading: false,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, loading: true }));
        try {
          await api.deleteOrientation(id, token);
          fetchOrientations();
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      }
    });
  };

  const handleViewAttendees = (orientationId) => {
    navigate(`/admin/reservations?orientation_id=${orientationId}`);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2670f2]/10 border border-[#2670f2]/30 text-[#2670f2] text-xs font-bold uppercase tracking-widest mb-2">
            <Calendar className="w-3.5 h-3.5" />
            Orientation Management
          </div>
          <h1 className="font-serif-luxury text-3xl font-bold text-white tracking-tight">
            Orientation Events
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-light">
            Create, schedule, edit, and track seat capacity across all BGA branches.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-3 rounded-xl bg-gold-gradient hover:bg-gold-gradient-hover text-slate-950 font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-slate-950" />
          <span>Create New Orientation</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, venue..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#2670f2] text-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Branch Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs shrink-0">
            <Building className="w-3.5 h-3.5 text-[#2670f2]" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All">All Branches</option>
              <option value="Tagum">Tagum</option>
              <option value="Butuan">Butuan</option>
              <option value="Pagadian">Pagadian</option>
              <option value="Bacolod">Bacolod</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#2670f2]" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Published">Published</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="Fully Booked">Fully Booked</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orientations Table */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#2670f2] mx-auto" />
          </div>
        ) : orientations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="font-semibold text-slate-300">No orientation events found.</p>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-[#2670f2]/20 border border-[#2670f2]/40 text-[#2670f2] text-xs font-bold"
            >
              Create First Orientation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-4 px-6">Event Title & Venue</th>
                  <th className="py-4 px-4">Branch</th>
                  <th className="py-4 px-4">Date & Time</th>
                  <th className="py-4 px-4">Capacity</th>
                  <th className="py-4 px-4">Remaining</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {orientations.map((event) => {
                  const remaining = Math.max(0, event.capacity - event.reserved);
                  const isFull = remaining === 0 || event.status === 'Fully Booked';

                  return (
                    <tr key={event.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-white text-sm">{event.title}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{event.venue}</div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold uppercase text-[10px]">
                          {event.branch}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-200">
                        <div className="font-bold text-white">{event.date}</div>
                        <div className="text-[11px] text-slate-400">{event.start_time} - {event.end_time}</div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-white font-bold">{event.reserved} / {event.capacity}</div>
                        <div className="text-[10px] text-slate-400">Seats Reserved</div>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`font-extrabold text-sm ${isFull ? 'text-red-400' : 'text-[#2670f2]'}`}>
                          {remaining} slots
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            event.status === 'Fully Booked'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : event.status === 'Closed'
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : event.status === 'Draft'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {event.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right space-x-1 shrink-0">
                        <button
                          onClick={() => handleViewAttendees(event.id)}
                          className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"
                          title="View Attendee List"
                        >
                          <Users className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(event)}
                          className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-all"
                          title="Edit Event"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDuplicate(event.id)}
                          className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-all"
                          title="Duplicate Event"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleClose(event.id, event.status)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                          title={event.status === 'Closed' ? 'Reopen Registration' : 'Close Registration'}
                        >
                          <Lock className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(event.id)}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                          title="Delete Event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      <OrientationFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        eventToEdit={eventToEdit}
        onSaved={fetchOrientations}
      />

      {/* Confirmation Popup Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        loading={confirmConfig.loading}
      />

    </div>
  );
}
