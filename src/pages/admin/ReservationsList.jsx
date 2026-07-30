import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Building,
  Calendar,
  Loader2,
  Sparkles,
  Download,
  Phone,
  Mail,
  MapPin,
  Eye
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ReservationDetailsModal from '../../components/ReservationDetailsModal';

export default function ReservationsList() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();

  const preOrientationId = searchParams.get('orientation_id') || 'All';

  const [reservations, setReservations] = useState([]);
  const [orientations, setOrientations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedOrientation, setSelectedOrientation] = useState(preOrientationId);

  // Selected reservation modal state
  const [selectedReservationDetails, setSelectedReservationDetails] = useState(null);

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
  }, [token, selectedBranch, selectedStatus, selectedOrientation, search]);

  const fetchData = async (isSilent = false) => {
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
      setOrientations(oList || []);
      setReservations(rList || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateReservationStatus(id, newStatus, token);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const exportSummary = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Ref Code,Full Name,Phone,Email,City,Branch,Date,Status']
        .concat(
          reservations.map(
            (r) =>
              `"${r.reference_number}","${r.full_name}","${r.phone}","${r.email}","${r.city}","${r.orientation_branch}","${r.orientation_date}","${r.status}"`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bga_reservations_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">

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
          className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#2670f2]" />
          <span>Export CSV</span>
        </button>
      </div>

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
              value={selectedOrientation}
              onChange={(e) => setSelectedOrientation(e.target.value)}
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

      {/* Table */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#2670f2] mx-auto" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Users className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="font-semibold text-slate-300">No reservations match your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-4 px-6">Reference & Applicant</th>
                  <th className="py-4 px-4">Contact Info</th>
                  <th className="py-4 px-4">Location</th>
                  <th className="py-4 px-4">Orientation Event</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {reservations.map((res) => (
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
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold uppercase text-[10px] mr-1.5">
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
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[11px] font-bold transition-all cursor-pointer"
                        >
                          Confirm
                        </button>
                      )}

                      {res.status !== 'Cancelled' && (
                        <button
                          onClick={() => handleStatusChange(res.id, 'Cancelled')}
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
        )}
      </div>

      {/* Reservation Details Popup Modal */}
      <ReservationDetailsModal
        isOpen={!!selectedReservationDetails}
        onClose={() => setSelectedReservationDetails(null)}
        reservation={selectedReservationDetails}
        onStatusChange={handleStatusChange}
      />

    </div>
  );
}
