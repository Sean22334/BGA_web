import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import FloatingMessenger from './components/FloatingMessenger';
import BackToTop from './components/BackToTop';
import { AuthProvider } from './context/AuthContext';
import { ContentProvider } from './context/ContentContext';
import ProtectedRoute from './components/ProtectedRoute';
import { BookingHeader, BookingFooter } from './components/BookingChrome';

const enableAdmin = import.meta.env.DEV || import.meta.env.VITE_ENABLE_ADMIN === 'true';
const HomePage = lazy(() => import('./pages/HomePage'));
const ReservePage = lazy(() => import('./pages/ReservePage'));
const SuccessPage = lazy(() => import('./pages/SuccessPage'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const OrientationsList = lazy(() => import('./pages/admin/OrientationsList'));
const ReservationsList = lazy(() => import('./pages/admin/ReservationsList'));
const ContentManager = lazy(() => import('./pages/admin/ContentManager'));

function PageLoading() {
  return <div role="status" className="px-4 py-32 text-center text-slate-300">Loading page...</div>;
}

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
  const isAdminRoute = enableAdmin && location.pathname.startsWith('/admin');
  const isBookingRoute = location.pathname === '/reserve' || location.pathname === '/success';

  return (
    <div className="min-h-screen flex flex-col bg-[#050D1A] text-slate-100 font-sans">
      {!isAdminRoute && !isBookingRoute && <Navbar />}
      {isBookingRoute && <BookingHeader />}
      <div className="flex-grow">
        <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/reserve" element={<ReservePage />} />
          <Route path="/success" element={<SuccessPage />} />
          {enableAdmin ? (
            <>
              <Route path="/admin/login" element={<AdminLogin />} />
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
                <Route path="cms" element={<ContentManager />} />
                <Route path="orientations" element={<OrientationsList />} />
                <Route path="reservations" element={<ReservationsList />} />
              </Route>
            </>
          ) : (
            <Route path="/admin/*" element={<Navigate to="/" replace />} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </div>
      {!isAdminRoute && !isBookingRoute && <Footer />}
      {isBookingRoute && <BookingFooter />}
      {!isAdminRoute && !isBookingRoute && <FloatingMessenger />}
      {!isAdminRoute && !isBookingRoute && <BackToTop />}
    </div>
  );
}

function AppShell() {
  return (
    <BrowserRouter>
      <ScrollToTopOnRoute />
      <MainLayout />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ContentProvider>
      {enableAdmin ? (
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      ) : (
        <AppShell />
      )}
    </ContentProvider>
  );
}
