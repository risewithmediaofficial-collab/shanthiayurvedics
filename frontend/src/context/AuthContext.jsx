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
      if (res.data?.success && res.data?.data?.user && res.data?.data?.isAuthenticated) {
        setUser(res.data.data.user);
        setIsAuthenticated(true);
        setToken(res.data.data.accessToken || null);
        initSocket(res.data.data.accessToken);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setToken(null);
        disconnectSocket();
      }
    } catch {
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
      setUser(null);
      setIsAuthenticated(false);
      setToken(null);
      disconnectSocket();
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
