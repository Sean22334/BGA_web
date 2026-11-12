import { reservationWorkbook } from '../../lib/reservationExcel.js';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Building,
  Calendar,
  Loader2,
  Sparkles,
  Download,
  Phone,
  Mail,
  Eye,
  Clock,
  MapPin,
  Filter,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/useAuth';
import ReservationDetailsModal from '../../components/ReservationDetailsModal';

const BRANCH_THEMES = {
  Butuan: {
    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    border: 'border-sky-500/40',
    glow: 'hover:shadow-sky-500/10'
  },
  Tagum: {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    border: 'border-emerald-500/40',
    glow: 'hover:shadow-emerald-500/10'
  },
  Pagadian: {
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    border: 'border-amber-500/40',
    glow: 'hover:shadow-amber-500/10'
  },
  Bacolod: {
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    border: 'border-purple-500/40',
    glow: 'hover:shadow-purple-500/10'
  }
};

function getBranchTheme(branch) {
  return BRANCH_THEMES[branch] || {
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    border: 'border-blue-500/40',
    glow: 'hover:shadow-blue-500/10'
  };
}

function getPageNumbers(current, total) {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, '...', total];
  }
  if (current >= total - 2) {
    return [1, '...', total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

export default function ReservationsList() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const preOrientationId = searchParams.get('orientation_id') || 'All';

  const [reservations, setReservations] = useState([]);
  const [orientations, setOrientations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const requestVersion = useRef(0);
  const statusLock = useRef(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedOrientation, setSelectedOrientation] = useState(preOrientationId);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected reservation modal state
  const [selectedReservationDetails, setSelectedReservationDetails] = useState(null);

  const fetchData = useCallback(async (isSilent = false) => {
    const version = ++requestVersion.current;
    if (!isSilent) setLoading(true);
    try {
      const [oList, rList] = await Promise.all([
        api.getOrientations(),
        api.getReservations(token, {
          branch: selectedBranch === 'All' ? null : selectedBranch,
          status: selectedStatus === 'All' ? null : selectedStatus,
          orientation_id: selectedOrientation === 'All' ? null : selectedOrientation,
          search
        })
      ]);
      if (version !== requestVersion.current) return;
      setError('');
      setOrientations(oList || []);
      setReservations(rList || []);
      setSelectedReservationDetails((current) => current ? (rList || []).find((row) => row.id === current.id) || null : null);
    } catch (err) {
      if (version === requestVersion.current) setError(err.message || 'Reservations could not be loaded.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [token, selectedBranch, selectedStatus, selectedOrientation, search]);

  useEffect(() => {
    fetchData();

    // Polling interval every 5 seconds for live real-time sync
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 5000);

    // Event listeners for instant cross-tab & client events
    const handleSync = () => fetchData(true);
    window.addEventListener('bga_reservation_event', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('bga_reservation_event', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchData]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranch, selectedStatus, selectedOrientation, search, pageSize]);

  const handleStatusChange = async (id, newStatus) => {
    if (statusLock.current) return;
    statusLock.current = true;
    setUpdatingId(id);
    try {
      await api.updateReservationStatus(id, newStatus, token);
      await fetchData(true);
    } catch (err) { setError(err.message); }
    finally { statusLock.current = false; setUpdatingId(null); }
  };

  const exportSummary = () => {
    const url = URL.createObjectURL(new Blob([reservationWorkbook(reservations)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    const suffix = selectedOrientation !== 'All' ? `_orientation_${selectedOrientation}` : selectedBranch !== 'All' ? `_${selectedBranch.toLowerCase()}` : '';
    link.download = 'bga_reservations_export' + suffix + '_' + new Date().toISOString().slice(0, 10) + '.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Grand total across all orientation sessions
  const totalAllAttendees = useMemo(() => {
    return orientations.reduce((sum, o) => sum + (Number(o.reserved) || 0), 0);
  }, [orientations]);

  // Pagination calculation
  const totalItems = reservations.length;
  const totalPages = pageSize === 'All' ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedReservations = useMemo(() => {
    if (pageSize === 'All') return reservations;
    const start = (currentPage - 1) * pageSize;
    return reservations.slice(start, start + pageSize);
  }, [reservations, currentPage, pageSize]);

  // Handle cluster card click
  const handleSelectCluster = (orientationId, branch = 'All') => {
    if (orientationId === 'All') {
      setSelectedOrientation('All');
      setSelectedBranch('All');
      setSearchParams({}, { replace: true });
    } else if (String(selectedOrientation) === String(orientationId)) {
      // Toggle off if already selected
      setSelectedOrientation('All');
      setSelectedBranch('All');
      setSearchParams({}, { replace: true });
    } else {
      setSelectedOrientation(String(orientationId));
      if (branch && branch !== 'All') setSelectedBranch(branch);
      setSearchParams({ orientation_id: String(orientationId) }, { replace: true });
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded-xl border border-red-400/30 p-4 text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchData()} className="underline font-semibold hover:text-white">Retry loading</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2670f2]/10 border border-[#2670f2]/30 text-[#2670f2] text-xs font-bold uppercase tracking-widest mb-2">
            <Users className="w-3.5 h-3.5" />
            Reservation Management
          </div>
          <h1 className="font-serif-luxury text-3xl font-bold text-white tracking-tight">
            Attendee Reservations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-light">
            Monitor, confirm, or cancel applicant seat reservations in real-time.
          </p>
        </div>

        <button
          onClick={exportSummary}
          disabled={loading || !!error}
          className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#2670f2]" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* CLUSTERING / CATEGORY CARDS SECTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-[#70A6FF]" />
            <span>Orientation Clusters & Hubs</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Click any card to view its registered attendees
          </span>
        </div>

        {/* Horizontal scrollable or multi-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

          {/* Master Card: All Orientations */}
          <div
            onClick={() => handleSelectCluster('All')}
            className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
              selectedOrientation === 'All' && selectedBranch === 'All'
                ? 'bg-[#2670f2]/15 border-[#2670f2] shadow-xl shadow-[#2670f2]/20 ring-1 ring-[#2670f2]'
                : 'glass-panel hover:border-white/20 hover:bg-slate-900/80'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <Sparkles className="w-3 h-3 text-[#70A6FF]" />
                All Hubs
              </span>
              {selectedOrientation === 'All' && selectedBranch === 'All' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2670f2] text-white flex items-center gap-1 shadow-sm">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              )}
            </div>

            <div className="space-y-1 mb-4">
              <h3 className="font-bold text-white text-base group-hover:text-[#70A6FF] transition-colors">
                All Orientations
              </h3>
              <p className="text-xs text-slate-400 line-clamp-1">
                All branches & upcoming schedules
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-white">
                <Users className="w-4 h-4 text-[#70A6FF]" />
                <span className="text-lg font-black">{totalAllAttendees}</span>
                <span className="text-xs text-slate-400">Total</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {orientations.length} {orientations.length === 1 ? 'session' : 'sessions'}
              </span>
            </div>
          </div>

          {/* Orientation Event Category Cards */}
          {orientations.map((o) => {
            const isSelected = String(selectedOrientation) === String(o.id);
            const theme = getBranchTheme(o.branch);
            const reservedCount = Number(o.reserved) || 0;
            const capacityDisplay = o.capacity ? `${reservedCount}/${o.capacity}` : 'Unlimited';

            return (
              <div
                key={o.id}
                onClick={() => handleSelectCluster(o.id, o.branch)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-[#2670f2]/15 border-[#2670f2] shadow-xl shadow-[#2670f2]/20 ring-1 ring-[#2670f2]'
                    : `glass-panel hover:border-white/20 hover:bg-slate-900/80 ${theme.glow}`
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${theme.badge}`}>
                    <Building className="w-3 h-3" />
                    {o.branch}
                  </span>

                  {isSelected ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2670f2] text-white flex items-center gap-1 shadow-sm">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      o.status === 'Fully Booked'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {o.status}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 mb-4">
                  <h3 className="font-bold text-white text-sm sm:text-base group-hover:text-[#70A6FF] transition-colors leading-snug">
                    {o.branch} Orientation
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-[#70A6FF] shrink-0" />
                    <span className="font-semibold">{o.date}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400 truncate">{o.start_time}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{o.venue}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-white">
                    <Users className="w-4 h-4 text-[#70A6FF]" />
                    <span className="text-lg font-black">{reservedCount}</span>
                    <span className="text-xs text-slate-400">Attendees</span>
                  </div>

                  <span className="text-[11px] font-medium text-slate-400">
                    Slots: <strong className="text-slate-300">{capacityDisplay}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Active Cluster Banner Notice */}
      {selectedOrientation !== 'All' && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#2670f2]/10 border border-[#2670f2]/30 text-xs text-slate-200">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#70A6FF] shrink-0" />
            <span>
              Showing reservations for{' '}
              <strong className="text-white">
                {orientations.find((o) => String(o.id) === String(selectedOrientation))?.branch || ''} Orientation
                {' '}({orientations.find((o) => String(o.id) === String(selectedOrientation))?.date || ''})
              </strong>
              {' '}— <span className="font-bold text-[#70A6FF]">{reservations.length}</span> attendee{reservations.length === 1 ? '' : 's'} registered
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleSelectCluster('All')}
            className="text-xs font-bold text-[#70A6FF] hover:text-white underline cursor-pointer"
          >
            Clear Filter (Show All)
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ref code, phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#2670f2] text-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Branch Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs shrink-0">
            <Building className="w-3.5 h-3.5 text-[#2670f2]" />
            <select
              aria-label="Reservation branch"
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

          {/* Orientation Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs shrink-0">
            <Calendar className="w-3.5 h-3.5 text-[#2670f2]" />
            <select
              aria-label="Reservation orientation"
              value={selectedOrientation}
              onChange={(e) => {
                setSelectedOrientation(e.target.value);
                const matched = orientations.find((o) => String(o.id) === String(e.target.value));
                if (matched) setSelectedBranch(matched.branch);
              }}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="All">All Orientations</option>
              {orientations.map((o) => (
                <option key={o.id} value={o.id}>
                  [{o.branch}] {o.date} ({o.start_time})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#2670f2]" />
            <select
              aria-label="Reservation status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table & Pagination Wrapper */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#2670f2] mx-auto" />
            <p className="mt-3 text-xs text-slate-400">Loading attendee reservations...</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Users className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="font-semibold text-slate-300">No reservations match your filter criteria.</p>
            {selectedOrientation !== 'All' && (
              <button
                onClick={() => handleSelectCluster('All')}
                className="text-xs text-[#70A6FF] underline font-bold hover:text-white mt-1 cursor-pointer"
              >
                Clear orientation filter
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Scrollable Container with Sticky Table Header */}
            <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs relative">
                <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold shadow-sm">
                  <tr>
                    <th className="py-4 px-6">Reference & Applicant</th>
                    <th className="py-4 px-4">Contact Info</th>
                    <th className="py-4 px-4">Location</th>
                    <th className="py-4 px-4">Orientation Event</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {paginatedReservations.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-900/50 transition-colors">

                      {/* Reference & Applicant */}
                      <td className="py-4 px-6">
                        <div className="font-mono text-xs font-bold text-[#2670f2]">{res.reference_number}</div>
                        <div className="font-bold text-white text-sm mt-0.5">{res.full_name}</div>
                        {res.notes && <div className="text-[11px] text-slate-400 italic max-w-xs truncate mt-0.5">"{res.notes}"</div>}
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5 text-white font-semibold">
                          <Phone className="w-3.5 h-3.5 text-[#2670f2]" />
                          <span>{res.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5 truncate max-w-[160px]">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{res.email}</span>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-4 px-4 text-slate-300">
                        <div className="font-bold text-white">{res.city}</div>
                        <div className="text-[11px] text-slate-400">{res.province}</div>
                      </td>

                      {/* Event */}
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] mr-1.5 border ${getBranchTheme(res.orientation_branch).badge}`}>
                          {res.orientation_branch}
                        </span>
                        <span className="font-bold text-white">{res.orientation_date}</span>
                        <div className="text-[11px] text-slate-400">{res.orientation_time}</div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            res.status === 'Confirmed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : res.status === 'Cancelled'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}
                        >
                          {res.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right space-x-1.5 shrink-0">
                        <button
                          onClick={() => setSelectedReservationDetails(res)}
                          className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-[#2670f2] border border-blue-500/30 text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                          title="View Complete Reservation Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>

                        {res.status !== 'Confirmed' && (
                          <button
                            onClick={() => handleStatusChange(res.id, 'Confirmed')}
                            disabled={updatingId === res.id}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[11px] font-bold transition-all cursor-pointer"
                          >
                            Confirm
                          </button>
                        )}

                        {res.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleStatusChange(res.id, 'Cancelled')}
                            disabled={updatingId === res.id}
                            className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[11px] font-bold transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-800/80 bg-slate-950/70 text-xs text-slate-400">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Showing <strong className="text-white">{totalItems === 0 ? 0 : (currentPage - 1) * (pageSize === 'All' ? totalItems : pageSize) + 1}</strong> to{' '}
                  <strong className="text-white">{pageSize === 'All' ? totalItems : Math.min(currentPage * pageSize, totalItems)}</strong> of{' '}
                  <strong className="text-white">{totalItems}</strong> reservations
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                  <span>Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(e.target.value === 'All' ? 'All' : Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-[#2670f2] cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value="All">All</option>
                  </select>
                </div>
              </div>

              {pageSize !== 'All' && totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 font-semibold transition flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>

                  {getPageNumbers(currentPage, totalPages).map((p, idx) => (
                    p === '...' ? (
                      <span key={`dots-${idx}`} className="px-2 py-1 text-slate-500">...</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition ${
                          currentPage === p
                            ? 'bg-[#2670f2] text-white shadow-md shadow-[#2670f2]/30'
                            : 'border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  ))}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 font-semibold transition flex items-center gap-1"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Reservation Details Popup Modal */}
      <ReservationDetailsModal
        isOpen={!!selectedReservationDetails}
        onClose={() => setSelectedReservationDetails(null)}
        reservation={selectedReservationDetails}
        onStatusChange={handleStatusChange}
        saving={updatingId !== null}
      />

    </div>
  );
}
