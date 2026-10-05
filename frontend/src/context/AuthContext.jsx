import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import apiClient from '../api/apiClient.js';
import { queryClient } from '../api/queryClient.js';
import { initSocket, disconnectSocket } from '../api/socketClient.js';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [authError, setAuthError] = useState(null);
  const sessionRequestRef = useRef(null);
  const generationRef = useRef(0);

  const clearSession = useCallback(() => {
    generationRef.current += 1;
    queryClient.clear();
    try {
      ['auth_access_token', 'auth_refresh_token', 'auth_user', 'switched_from_owner'].forEach((key) => localStorage.removeItem(key));
      sessionStorage.removeItem('active_branch_id');
    } catch { /* Private browsing may restrict storage. */ }
    delete apiClient.defaults.headers.common.Authorization;
    setUser(null);
    setToken(null);
    disconnectSocket();
  }, []);

  const applySession = useCallback((data) => {
    let accessToken = data.accessToken;
    try { accessToken ||= localStorage.getItem('auth_access_token'); } catch { /* Cookies remain available. */ }
    if (accessToken) apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    try {
      if (accessToken) localStorage.setItem('auth_access_token', accessToken);
      if (data.refreshToken) localStorage.setItem('auth_refresh_token', data.refreshToken);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
    } catch { /* Keep the in-memory session working. */ }
    setUser(data.user);
    setToken(accessToken || null);
    setAuthError(null);
    initSocket(accessToken);
  }, []);

  const checkAuth = useCallback(() => {
    if (sessionRequestRef.current) return sessionRequestRef.current;
    const generation = generationRef.current;
    setIsLoading(true);
    setAuthError(null);
    sessionRequestRef.current = (async () => {
      try {
        const response = await apiClient.get('/auth/session');
        let data = response.data?.success ? response.data.data : null;
        if (data?.user && !Array.isArray(data.user.permissions)) {
          // The session endpoint on older deployments omits grants; /auth/me does not.
          try {
            const profile = await apiClient.get('/auth/me');
            data = { ...data, user: { ...data.user, ...profile.data?.data?.user } };
          } catch { /* Keep the valid session; individual API endpoints still authorize. */ }
        }
        if (generation !== generationRef.current) return;
        if (data?.user && data.isAuthenticated !== false) applySession(data);
        else clearSession();
      } catch (error) {
        if (generation !== generationRef.current) return;
        if ([400, 401, 403].includes(error.response?.status)) clearSession();
        else setAuthError('Unable to check your session. Check your connection and try again.');
      } finally {
        setIsLoading(false);
        sessionRequestRef.current = null;
      }
    })();
    return sessionRequestRef.current;
  }, [applySession, clearSession]);

  useEffect(() => {
    void checkAuth();
    const expired = () => { clearSession(); setIsLoading(false); };
    const refreshed = (event) => { if (event.detail?.user) applySession(event.detail); };
    window.addEventListener('auth:session_expired', expired);
    window.addEventListener('auth:token_refreshed', refreshed);
    return () => {
      window.removeEventListener('auth:session_expired', expired);
      window.removeEventListener('auth:token_refreshed', refreshed);
    };
  }, [checkAuth, clearSession, applySession]);

  const login = useCallback(async (credentials) => {
    generationRef.current += 1;
    const response = await apiClient.post('/auth/login', credentials);
    if (!response.data?.success) throw new Error(response.data?.message || 'Login failed');
    queryClient.clear();
    try { sessionStorage.removeItem('active_branch_id'); } catch { /* No storage. */ }
    applySession(response.data.data);
    return response.data;
  }, [applySession]);

  const switchAccount = useCallback(async ({ role, email }) => {
    generationRef.current += 1;
    let resData;
    try {
      const response = await apiClient.post('/auth/switch-account', { role, email });
      if (!response.data?.success) throw new Error(response.data?.message || 'Switch failed');
      resData = response.data.data;
    } catch {
      // Fallback to direct login with demo credentials
      const response = await apiClient.post('/auth/login', {
        email,
        password: 'Password@12345'
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'Login failed');
      resData = response.data.data;
    }
    queryClient.clear();
    try { sessionStorage.removeItem('active_branch_id'); } catch { /* No storage. */ }
    applySession(resData);
    return resData;
  }, [applySession]);

  const logout = useCallback(async () => {
    let refreshToken;
    try { refreshToken = localStorage.getItem('auth_refresh_token'); } catch { /* Use cookie. */ }
    try { await apiClient.post('/auth/logout', { refreshToken }); }
    catch { window.dispatchEvent(new CustomEvent('crm:error', { detail: { message: 'Signed out on this device. The server could not be reached to revoke the session.' } })); }
    finally { clearSession(); }
  }, [clearSession]);

  const updateProfile = useCallback((updatedUser) => setUser((previous) => ({ ...previous, ...updatedUser })), []);
  const value = useMemo(() => ({ user, isAuthenticated: Boolean(user), isLoading, authError, token, login, logout, switchAccount, checkAuth, updateProfile }),
    [user, isLoading, authError, token, login, logout, switchAccount, checkAuth, updateProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
export default AuthContext;
