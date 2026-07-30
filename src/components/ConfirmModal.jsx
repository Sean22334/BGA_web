import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, Trash2, X, Check, Loader2 } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'info' | 'warning'
  loading = false
}) {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92 }}
          className="glass-panel w-full max-w-md p-6 sm:p-7 rounded-3xl border border-[#2670f2]/40 shadow-2xl relative overflow-hidden text-center space-y-5"
        >
          {/* Top Decorative Accent Line */}
          <div
            className={`absolute top-0 left-0 right-0 h-1.5 ${
              isDanger
                ? 'bg-gradient-to-r from-red-500 via-rose-600 to-red-700'
                : 'bg-gradient-to-r from-blue-500 via-[#2670f2] to-blue-700'
            }`}
          />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon Badge */}
          <div className="relative w-16 h-16 mx-auto pt-1">
            <div
              className={`w-full h-full rounded-2xl flex items-center justify-center border shadow-xl ${
                isDanger
                  ? 'bg-red-500/15 border-red-500/30 text-red-400 shadow-red-500/10'
                  : 'bg-[#2670f2]/15 border-[#2670f2]/30 text-[#2670f2] shadow-[#2670f2]/10'
              }`}
            >
              {isDanger ? <Trash2 className="w-8 h-8" /> : <Info className="w-8 h-8" />}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h3 className="font-serif-luxury font-bold text-xl text-white">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed px-2">
              {message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-1/2 py-3 rounded-xl border border-slate-700/80 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`w-1/2 py-3 rounded-xl font-extrabold text-xs shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-105 cursor-pointer ${
                isDanger
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-red-600/30'
                  : 'bg-gold-gradient text-slate-950 shadow-[#2670f2]/30'
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
