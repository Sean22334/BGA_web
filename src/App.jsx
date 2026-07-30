import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import FloatingMessenger from './components/FloatingMessenger';
import BackToTop from './components/BackToTop';
import HomePage from './pages/HomePage';
import ReservePage from './pages/ReservePage';
import SuccessPage from './pages/SuccessPage';

// Admin System Imports
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import OrientationsList from './pages/admin/OrientationsList';
import ReservationsList from './pages/admin/ReservationsList';

function ScrollToTopOnRoute() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

function MainLayout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col bg-[#050D1A] text-slate-100 font-sans">
      {!isAdminRoute && <Navbar />}
      <div className="flex-grow">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/reserve" element={<ReservePage />} />
          <Route path="/success" element={<SuccessPage />} />

          {/* Admin Authentication */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Admin Portal */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="orientations" element={<OrientationsList />} />
            <Route path="reservations" element={<ReservationsList />} />
          </Route>
        </Routes>
      </div>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <FloatingMessenger />}
      {!isAdminRoute && <BackToTop />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTopOnRoute />
        <MainLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}
