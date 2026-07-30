import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import FloatingMessenger from './components/FloatingMessenger';
import BackToTop from './components/BackToTop';
import HomePage from './pages/HomePage';
import ReservePage from './pages/ReservePage';
import SuccessPage from './pages/SuccessPage';
import { AuthProvider } from './context/AuthContext';
import AdminRoutes from './AdminRoutes';

const enableAdmin = import.meta.env.DEV || import.meta.env.VITE_ENABLE_ADMIN === 'true';

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

  return (
    <div className="min-h-screen flex flex-col bg-[#050D1A] text-slate-100 font-sans">
      {!isAdminRoute && <Navbar />}
      <div className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/reserve" element={<ReservePage />} />
          <Route path="/success" element={<SuccessPage />} />
          {enableAdmin ? (
            <AdminRoutes />
          ) : (
            <Route path="/admin/*" element={<Navigate to="/" replace />} />
          )}
        </Routes>
      </div>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <FloatingMessenger />}
      {!isAdminRoute && <BackToTop />}
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
  if (enableAdmin) {
    return (
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    );
  }

  return <AppShell />;
}
