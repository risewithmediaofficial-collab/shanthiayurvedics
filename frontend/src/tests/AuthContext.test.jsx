/**
 * Unit / integration tests for the AuthContext (AuthProvider + useAuth hook)
 * from src/context/AuthContext.jsx
 *
 * Tests: login, logout, checkAuth, updateProfile, session_expired event, useAuth guard
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, act, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext.jsx';

// ── Mock dependencies ─────────────────────────────────────────────────────────
vi.mock('../api/apiClient.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { headers: { common: {} } },
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }
}));

vi.mock('../api/socketClient.js', () => ({
  initSocket: vi.fn(),
  disconnectSocket: vi.fn(),
  getSocket: vi.fn(() => null)
}));

import apiClient from '../api/apiClient.js';
import { initSocket, disconnectSocket } from '../api/socketClient.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

const mockUser = {
  id: 'user1',
  name: 'Test Owner',
  email: 'owner@test.com',
  role: 'OWNER',
  permissions: ['orders.view']
};

// ─── AuthProvider — initial session check ─────────────────────────────────────

describe('AuthProvider — checkAuth on mount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should set isAuthenticated=true when session endpoint returns valid user', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          user: mockUser,
          isAuthenticated: true,
          accessToken: 'test_token'
        }
      }
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user.email).toBe(mockUser.email);
    expect(initSocket).toHaveBeenCalledWith('test_token');
  });

  it('should set isAuthenticated=false when session endpoint returns no user', async () => {
    apiClient.get.mockResolvedValue({
      data: { success: true, data: { user: null, isAuthenticated: false } }
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should set isAuthenticated=false when session endpoint throws', async () => {
    apiClient.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
  });
});

// ─── login() ──────────────────────────────────────────────────────────────────

describe('AuthProvider — login()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Silence checkAuth during login tests
    apiClient.get.mockResolvedValue({
      data: { success: false, data: null }
    });
  });

  it('should set user and isAuthenticated=true on successful login', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          user: mockUser,
          accessToken: 'access_abc',
          refreshToken: 'refresh_xyz'
        }
      }
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login({ email: 'owner@test.com', password: 'Password@12345' });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user.email).toBe('owner@test.com');
    expect(localStorage.getItem('auth_access_token')).toBe('access_abc');
    expect(localStorage.getItem('auth_refresh_token')).toBe('refresh_xyz');
    expect(initSocket).toHaveBeenCalledWith('access_abc');
  });

  it('should throw when login response is not successful', async () => {
    apiClient.post.mockResolvedValue({
      data: { success: false, message: 'Invalid credentials' }
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => {
        await result.current.login({ email: 'bad@test.com', password: 'wrong' });
      })
    ).rejects.toThrow();
  });
});

// ─── logout() ────────────────────────────────────────────────────────────────

describe('AuthProvider — logout()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('auth_access_token', 'some_token');
    // Simulate authenticated state via checkAuth
    apiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: { user: mockUser, isAuthenticated: true, accessToken: 'some_token' }
      }
    });
  });

  it('should clear user, isAuthenticated and localStorage on logout', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('auth_access_token')).toBeNull();
    expect(disconnectSocket).toHaveBeenCalled();
  });

  it('should still clear state even if logout API call fails', async () => {
    apiClient.post.mockRejectedValue(new Error('Server unreachable'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});

// ─── updateProfile() ─────────────────────────────────────────────────────────

describe('AuthProvider — updateProfile()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: { user: mockUser, isAuthenticated: true, accessToken: 't' }
      }
    });
  });

  it('should merge updated fields into current user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateProfile({ name: 'Updated Name' });
    });

    expect(result.current.user.name).toBe('Updated Name');
    expect(result.current.user.email).toBe(mockUser.email); // unchanged
  });
});

// ─── auth:session_expired event ───────────────────────────────────────────────

describe('AuthProvider — auth:session_expired event', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: { user: mockUser, isAuthenticated: true, accessToken: 't' }
      }
    });
  });

  it('should clear auth state when auth:session_expired is dispatched', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Simulate session expired event
    act(() => {
      window.dispatchEvent(new CustomEvent('auth:session_expired'));
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});

// ─── useAuth guard ────────────────────────────────────────────────────────────

describe('useAuth guard', () => {
  it('should throw when used outside AuthProvider', () => {
    // Suppress React error boundary console.error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
    spy.mockRestore();
  });
});
