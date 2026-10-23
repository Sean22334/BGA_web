import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export default function AdminLayout() {
  const { admin, logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logoutAdmin();
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Website Content (CMS)', path: '/admin/cms', icon: Globe },
    { name: 'Orientation Events', path: '/admin/orientations', icon: Calendar },
    { name: 'Reservation Requests', path: '/admin/reservations', icon: Users }
  ];

  return (
    <div className="min-h-screen bg-[#030914] text-slate-100 flex flex-col md:flex-row">

      {/* ================================================== */}
      {/* SIDEBAR NAVIGATION (Desktop: Sticky 64w, Mobile: Drawer) */}
      {/* ================================================== */}

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 bottom-0 z-50 w-64 bg-[#050D1A] border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
            <Link to="/admin/dashboard" className="flex items-center gap-3">
              <img
                src="/images/BGA LOGOOO.png"
                alt="Bluechef Global Academy Logo"
                className="w-9 h-9 object-contain filter drop-shadow-[0_4px_10px_rgba(38,112,242,0.4)]"
              />
              <div className="flex flex-col">
                <span className="font-serif-luxury font-black text-base tracking-wider text-white leading-none">
                  BLUECHEF <span className="text-[#2670f2] font-light text-xs">GLOBAL</span>
                </span>
                <span className="text-[9px] tracking-[0.2em] text-slate-400 uppercase font-semibold mt-0.5">
                  Admissions Portal
                </span>
              </div>
            </Link>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 pb-2 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
              Management Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive
                      ? 'bg-gold-gradient text-slate-950 shadow-lg shadow-[#2670f2]/20 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Public Web Link & User Profile */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <Link
            to="/reserve"
            target="_blank"
            className="w-full px-3.5 py-2.5 rounded-xl glass-panel border border-[#2670f2]/30 text-xs font-semibold text-slate-200 hover:text-[#2670f2] transition-colors flex items-center justify-between group"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#2670f2]" />
              Public Website
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#2670f2]" />
          </Link>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-[#2670f2] flex items-center justify-center text-slate-950 font-bold text-sm shrink-0">
                {admin?.name?.charAt(0) || 'A'}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">{admin?.name || 'Admin Officer'}</div>
                <div className="text-[10px] text-slate-400 truncate">{admin?.email || 'admin@bluechef.ph'}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ================================================== */}
      {/* MAIN CONTENT AREA */}
      {/* ================================================== */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#050D1A]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#2670f2]/10 border border-[#2670f2]/30 text-[#2670f2] text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>BGA Admissions System • All Branches Active</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden lg:block text-slate-400 font-mono">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl border border-slate-700/80 hover:border-red-500/40 text-slate-300 hover:text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Dynamic Nested Page Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
