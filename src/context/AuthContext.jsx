import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { AuthContext } from './useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function persistSession(admin, token, provider) {
  if (admin && token) {
    localStorage.setItem('bga_admin_token', token);
    localStorage.setItem('bga_admin_user', JSON.stringify(admin));
    localStorage.setItem('bga_admin_provider', provider);
  } else {
    localStorage.removeItem('bga_admin_token');
    localStorage.removeItem('bga_admin_user');
    localStorage.removeItem('bga_admin_provider');
  }
}

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const providerRef = useRef(null);
  const revisionRef = useRef(0);

  const loginAdmin = useCallback((adminData, jwtToken, provider = 'supabase') => {
    revisionRef.current += 1;
    providerRef.current = provider;
    persistSession(adminData, jwtToken, provider);
    setAdmin(adminData);
    setToken(jwtToken);
    setLoading(false);
  }, []);

  const logoutAdmin = useCallback(async () => {
    revisionRef.current += 1;
    providerRef.current = null;
    persistSession(null, null, null);
    setAdmin(null);
    setToken(null);
    if (isSupabaseConfigured && supabase) await supabase.auth.signOut({ scope: 'local' });
  }, []);

  useEffect(() => {
    let active = true;
    let authTimer;

    const restoreSession = async () => {
      const revision = ++revisionRef.current;
      const provider = localStorage.getItem('bga_admin_provider');
      try {
        let restoredAdmin;
        let restoredToken;
        let restoredProvider;
        if (import.meta.env.DEV && provider === 'express') {
          restoredToken = localStorage.getItem('bga_admin_token');
          const response = await fetch(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${restoredToken}` } });
          if (!response.ok) throw new Error('Session expired.');
          ({ admin: restoredAdmin } = await response.json());
          restoredProvider = 'express';
        } else if (isSupabaseConfigured && supabase) {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !session) throw new Error('No active session.');
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) throw new Error('Session expired.');
          const { data: membership, error: membershipError } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
          if (membershipError || !membership) throw new Error('Administrator access required.');
          restoredAdmin = { id: user.id, email: user.email, name: user.user_metadata?.name };
          restoredToken = session.access_token;
          restoredProvider = 'supabase';
        } else {
          throw new Error('No active session.');
        }
        if (active && revision === revisionRef.current && restoredAdmin && restoredToken) {
          providerRef.current = restoredProvider;
          persistSession(restoredAdmin, restoredToken, restoredProvider);
          setAdmin(restoredAdmin);
          setToken(restoredToken);
        }
      } catch {
        if (active && revision === revisionRef.current) {
          providerRef.current = null;
          persistSession(null, null, null);
          setAdmin(null);
          setToken(null);
        }
      } finally {
        if (active && revision === revisionRef.current) setLoading(false);
      }
    };

    void restoreSession();
    const subscription = isSupabaseConfigured && supabase
      ? supabase.auth.onAuthStateChange((event) => {
          if (event === 'INITIAL_SESSION' || providerRef.current === 'express') return;
          // Query after the auth client's callback lock has been released.
          clearTimeout(authTimer);
          authTimer = setTimeout(() => { void restoreSession(); }, 0);
        }).data.subscription
      : null;
    const handleStorage = (event) => {
      if (event.key === 'bga_admin_provider' || event.key === 'bga_admin_token') void restoreSession();
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      active = false;
      clearTimeout(authTimer);
      subscription?.unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ admin, token, isAuthenticated: !!admin && !!token, loading, loginAdmin, logoutAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
