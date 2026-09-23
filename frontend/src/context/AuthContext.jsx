import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient.js';
import { initSocket, disconnectSocket } from '../api/socketClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Check current auth status via non-throwing session endpoint
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/auth/session');
      const sessionData = res.data?.success ? res.data.data : null;

      if (sessionData?.user && sessionData?.isAuthenticated !== false) {
        setUser(sessionData.user);
        setIsAuthenticated(true);
        if (sessionData.accessToken) {
          setToken(sessionData.accessToken);
          try {
            localStorage.setItem('auth_access_token', sessionData.accessToken);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${sessionData.accessToken}`;
          } catch {}
          initSocket(sessionData.accessToken);
        }
        try {
          localStorage.setItem('auth_user', JSON.stringify(sessionData.user));
        } catch {}
      } else {
        try {
          localStorage.removeItem('auth_access_token');
          localStorage.removeItem('auth_refresh_token');
          localStorage.removeItem('auth_user');
        } catch {}
        delete apiClient.defaults.headers.common['Authorization'];
        setUser(null);
        setIsAuthenticated(false);
        setToken(null);
        disconnectSocket();
      }
    } catch {
      try {
        localStorage.removeItem('auth_access_token');
        localStorage.removeItem('auth_refresh_token');
        localStorage.removeItem('auth_user');
      } catch {}
      delete apiClient.defaults.headers.common['Authorization'];
      setUser(null);
      setIsAuthenticated(false);
      setToken(null);
      disconnectSocket();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleSessionExpired = () => {
      try {
        localStorage.removeItem('auth_access_token');
        localStorage.removeItem('auth_refresh_token');
        localStorage.removeItem('auth_user');
      } catch {}
      delete apiClient.defaults.headers.common['Authorization'];
      setUser(null);
      setIsAuthenticated(false);
      setToken(null);
      disconnectSocket();

      // Avoid staying on protected page firing failed queries
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/forgot') &&
        !window.location.pathname.startsWith('/reset')
      ) {
        window.location.replace('/login');
      }
    };

    window.addEventListener('auth:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:session_expired', handleSessionExpired);
    };
  }, [checkAuth]);

  const login = async (credentials) => {
    const res = await apiClient.post('/auth/login', credentials);
    if (res.data?.success) {
      const userData = res.data.data.user;
      const accessToken = res.data.data.accessToken;
      const refreshToken = res.data.data.refreshToken;

      try {
        if (accessToken) {
          localStorage.setItem('auth_access_token', accessToken);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        }
        if (refreshToken) {
          localStorage.setItem('auth_refresh_token', refreshToken);
        }
        if (userData) {
          localStorage.setItem('auth_user', JSON.stringify(userData));
        }
      } catch {}

      setUser(userData);
      setIsAuthenticated(true);
      setToken(accessToken);
      initSocket(accessToken);
      return res.data;
    }
    throw new Error(res.data?.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.warn('Logout request failed:', e);
    } finally {
      try {
        localStorage.removeItem('auth_access_token');
        localStorage.removeItem('auth_refresh_token');
        localStorage.removeItem('auth_user');
      } catch {}
      delete apiClient.defaults.headers.common['Authorization'];
      setUser(null);
      setIsAuthenticated(false);
      setToken(null);
      disconnectSocket();
    }
  };

  const updateProfile = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        token,
        login,
        logout,
        checkAuth,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
