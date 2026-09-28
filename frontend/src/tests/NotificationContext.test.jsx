/**
 * Unit tests for NotificationContext (NotificationProvider + useNotifications hook)
 * from src/context/NotificationContext.jsx
 *
 * Tests: fetchNotifications, markAsRead, markAllAsRead, socket events, guard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { NotificationProvider, useNotifications } from '../context/NotificationContext.jsx';

// ── Mock dependencies ──────────────────────────────────────────────────────────
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn()
}));

vi.mock('../api/apiClient.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    defaults: { headers: { common: {} } },
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }
}));

vi.mock('../api/socketClient.js', () => ({
  getSocket: vi.fn(),
  initSocket: vi.fn(),
  disconnectSocket: vi.fn()
}));

import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/apiClient.js';
import { getSocket } from '../api/socketClient.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockNotifications = [
  { _id: 'n1', title: 'Test 1', message: 'Hello', type: 'INFO', isRead: false, createdAt: new Date().toISOString() },
  { _id: 'n2', title: 'Test 2', message: 'World', type: 'INFO', isRead: true, createdAt: new Date().toISOString() }
];

function makeWrapper(isAuthenticated = true) {
  useAuth.mockReturnValue({ isAuthenticated });
  return ({ children }) => <NotificationProvider>{children}</NotificationProvider>;
}

// ─── fetchNotifications on mount ──────────────────────────────────────────────

describe('NotificationProvider — initial fetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSocket.mockReturnValue(null);
  });

  it('should fetch and store notifications when authenticated', async () => {
    apiClient.get.mockResolvedValue({
      data: { success: true, data: mockNotifications, unreadCount: 1 }
    });

    const { result } = renderHook(() => useNotifications(), {
      wrapper: makeWrapper(true)
    });

    await waitFor(() => expect(result.current.notifications.length).toBe(2));
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('should compute unreadCount from data when unreadCount is not in response', async () => {
    apiClient.get.mockResolvedValue({
      data: { success: true, data: mockNotifications }
    });

    const { result } = renderHook(() => useNotifications(), {
      wrapper: makeWrapper(true)
    });

    await waitFor(() => expect(result.current.notifications.length).toBe(2));
    // 1 unread (n1.isRead=false)
    expect(result.current.unreadCount).toBe(1);
  });

  it('should NOT fetch when unauthenticated', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: makeWrapper(false)
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('should not throw when fetch fails', async () => {
    apiClient.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNotifications(), {
      wrapper: makeWrapper(true)
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifications).toEqual([]);
  });
});

// ─── markAsRead() ──────────────────────────────────────────────────────────────

describe('NotificationProvider — markAsRead()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSocket.mockReturnValue(null);
    apiClient.get.mockResolvedValue({
      data: { success: true, data: mockNotifications, unreadCount: 1 }
    });
  });

  it('should mark a notification as read and decrement unreadCount', async () => {
    apiClient.patch.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useNotifications(), {
      wrapper: makeWrapper(true)
    });

    await waitFor(() => expect(result.current.notifications.length).toBe(2));

    await act(async () => {
      await result.current.markAsRead('n1');
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/n1/read');
    const updated = result.current.notifications.find((n) => n._id === 'n1');
    expect(updated.isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('should not go below 0 for unreadCount', async () => {
    apiClient.patch.mockResolvedValue({ data: { success: true } });
    // Start with unreadCount already at 0
    apiClient.get.mockResolvedValue({
      data: { success: true, data: [], unreadCount: 0 }
    });

    const { result } = renderHook(() => useNotifications(), {
      wrapper: makeWrapper(true)
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.markAsRead('n_nonexistent');
    });

    expect(result.current.unreadCount).toBe(0);
  });
});

// ─── markAllAsRead() ─────────────────────────────────────────────────────────

describe('NotificationProvider — markAllAsRead()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSocket.mockReturnValue(null);
    apiClient.get.mockResolvedValue({
      data: { success: true, data: mockNotifications, unreadCount: 1 }
    });
  });

  it('should mark all notifications as read and reset unreadCount to 0', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useNotifications(), {
      wrapper: makeWrapper(true)
    });

    await waitFor(() => expect(result.current.notifications.length).toBe(2));

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(apiClient.post).toHaveBeenCalledWith('/notifications/read-all');
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((n) => n.isRead)).toBe(true);
  });
});

// ─── Socket event listeners ───────────────────────────────────────────────────

describe('NotificationProvider — socket events', () => {
  it('should register socket event listeners when authenticated and socket exists', async () => {
    const mockSocket = {
      on: vi.fn(),
      off: vi.fn()
    };
    getSocket.mockReturnValue(mockSocket);
    apiClient.get.mockResolvedValue({
      data: { success: true, data: [], unreadCount: 0 }
    });

    const { unmount } = renderHook(() => useNotifications(), {
      wrapper: makeWrapper(true)
    });

    await waitFor(() => expect(mockSocket.on).toHaveBeenCalled());
    const registeredEvents = mockSocket.on.mock.calls.map(([event]) => event);
    expect(registeredEvents).toContain('notification:new');
    expect(registeredEvents).toContain('lead:assigned');
    expect(registeredEvents).toContain('followup:due');

    unmount();
    expect(mockSocket.off).toHaveBeenCalledWith('notification:new', expect.any(Function));
  });
});

// ─── useNotifications guard ───────────────────────────────────────────────────

describe('useNotifications guard', () => {
  it('should throw when used outside NotificationProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useNotifications())).toThrow(
      'useNotifications must be used within a NotificationProvider'
    );
    spy.mockRestore();
  });
});
