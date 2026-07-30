import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('bga_admin_token');
    const savedAdmin = localStorage.getItem('bga_admin_user');
    if (savedToken && savedAdmin) {
      try {
        setToken(savedToken);
        setAdmin(JSON.parse(savedAdmin));
      } catch (err) {
        localStorage.removeItem('bga_admin_token');
        localStorage.removeItem('bga_admin_user');
      }
    }
    setLoading(false);
  }, []);

  const loginAdmin = (adminData, jwtToken) => {
    setAdmin(adminData);
    setToken(jwtToken);
    localStorage.setItem('bga_admin_token', jwtToken);
    localStorage.setItem('bga_admin_user', JSON.stringify(adminData));
  };

  const logoutAdmin = () => {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem('bga_admin_token');
    localStorage.removeItem('bga_admin_user');
  };

  return (
    <AuthContext.Provider value={{ admin, token, isAuthenticated: !!token, loading, loginAdmin, logoutAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
