import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function EditReservationModal({
  isOpen,
  onClose,
  initialData,
  referenceNumber,
  currentPhone,
  onSaveSuccess
}) {
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    currentAddress: '',
    city: '',
    province: '',
    additionalNotes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        fullName: initialData.fullName || initialData.full_name || '',
        mobileNumber: initialData.mobileNumber || initialData.phone || currentPhone || '',
        email: initialData.email || '',
        currentAddress: initialData.currentAddress || initialData.address || '',
        city: initialData.city || '',
        province: initialData.province || '',
        additionalNotes: initialData.additionalNotes || initialData.notes || ''
      });
      setErrorMessage('');
    }
  }, [initialData, currentPhone, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      setErrorMessage('Full name must be at least 2 characters.');
      return;
    }
    const cleanPhone = formData.mobileNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      setErrorMessage('Please enter a valid mobile number (10 to 15 digits).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!formData.currentAddress.trim() || formData.currentAddress.trim().length < 5) {
      setErrorMessage('Complete address is required (at least 5 characters).');
      return;
    }
    if (!formData.city.trim() || formData.city.trim().length < 2) {
      setErrorMessage('City or Municipality is required.');
      return;
    }
    if (!formData.province.trim() || formData.province.trim().length < 2) {
      setErrorMessage('Province is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        reference_number: referenceNumber,
        phone: currentPhone || formData.mobileNumber,
        full_name: formData.fullName.trim(),
        new_phone: formData.mobileNumber.trim(),
        email: formData.email.trim().toLowerCase(),
        address: formData.currentAddress.trim(),
        city: formData.city.trim(),
        province: formData.province.trim(),
        notes: formData.additionalNotes.trim()
      };

      const result = await api.updateApplicantReservation(payload);

      const updatedApplicant = {
        fullName: payload.full_name,
        mobileNumber: payload.new_phone,
        email: payload.email,
        currentAddress: payload.address,
        city: payload.city,
        province: payload.province,
        additionalNotes: payload.notes
      };

      try {
        sessionStorage.setItem(`bga_confirmation_phone:${referenceNumber}`, payload.new_phone);
        sessionStorage.setItem(`bga_applicant_data:${referenceNumber}`, JSON.stringify(updatedApplicant));
      } catch { /* storage fallback */ }

      if (onSaveSuccess) {
        onSaveSuccess(updatedApplicant, result?.reservation);
      }
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update reservation details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit Reservation Details"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass-panel w-full max-w-xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 rounded-3xl border border-[#2670f2]/40 shadow-2xl relative my-auto space-y-6 text-left"
        >
          {/* Top Decorative Blue Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-[#2670f2] to-blue-700" />

          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1 text-xs font-bold text-[#70A6FF] uppercase tracking-wider">
                <Edit3 className="w-3.5 h-3.5" />
                Review & Edit Details
              </div>
              <h3 className="font-serif-luxury font-bold text-2xl text-white">
                Correct Typographical Errors
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Reference: <span className="font-mono text-white font-bold">{referenceNumber}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Juan Dela Cruz"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[#2670f2]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  placeholder="0917 123 4567"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[#2670f2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="juan@example.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[#2670f2]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Complete Address *
              </label>
              <input
                type="text"
                required
                value={formData.currentAddress}
                onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                placeholder="House / Unit No., Street, Barangay"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[#2670f2]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  City / Municipality *
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Tagum City"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[#2670f2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Province *
                </label>
                <input
                  type="text"
                  required
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  placeholder="Davao del Norte"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[#2670f2]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Additional Notes / Questions (Optional)
              </label>
              <textarea
                rows={3}
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                placeholder="Any special inquiries or dietary/accessibility requirements"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[#2670f2] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-slate-700 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving corrections...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Corrections</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

