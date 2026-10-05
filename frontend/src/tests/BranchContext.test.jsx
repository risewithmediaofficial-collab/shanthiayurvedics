/**
 * Unit tests for BranchContext (BranchProvider + useBranch hook)
 * from src/context/BranchContext.jsx
 *
 * Tests: branch loading for OWNER/non-owner, selectBranch, sessionStorage sync,
 *        query invalidation, useBranch guard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { BranchProvider, useBranch } from '../context/BranchContext.jsx';

// ── Mock dependencies ──────────────────────────────────────────────────────────
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn()
}));

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

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn(), clear: vi.fn() })),
  useQuery: vi.fn(() => ({
    data: {
      data: [
        { _id: 'branch1', name: 'Hosur', code: 'HSR' },
        { _id: 'branch2', name: 'Salem', code: 'SLM' }
      ]
    },
    isLoading: false
  }))
}));

import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/apiClient.js';
import { useQueryClient } from '@tanstack/react-query';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const branches = [
  { _id: 'branch1', name: 'Hosur', code: 'HSR' },
  { _id: 'branch2', name: 'Salem', code: 'SLM' }
];

function makeWrapper(userRole = 'OWNER', userBranches = [], branchId = null) {
  const mockUser = {
    role: userRole,
    branchId,
    branches: userBranches,
    permissions: []
  };
  useAuth.mockReturnValue({ user: mockUser });
  apiClient.get.mockResolvedValue({ data: { data: branches } });
  return ({ children }) => <BranchProvider>{children}</BranchProvider>;
}

// ─── OWNER branch loading ─────────────────────────────────────────────────────

describe('BranchProvider — OWNER', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('should load all branches for OWNER and default to ALL', async () => {
    const { result } = renderHook(() => useBranch(), { wrapper: makeWrapper('OWNER') });

    await waitFor(() => expect(result.current.availableBranches.length).toBe(2));
    expect(result.current.selectedBranchId).toBe('ALL');
    expect(result.current.isOwner).toBe(true);
  });

  it('should restore saved branch from sessionStorage for OWNER', async () => {
    sessionStorage.setItem('active_branch_id', 'branch1');
    const { result } = renderHook(() => useBranch(), { wrapper: makeWrapper('OWNER') });

    await waitFor(() => expect(result.current.availableBranches.length).toBe(2));
    expect(result.current.selectedBranchId).toBe('branch1');
  });

  it('should fallback to ALL when saved branch is not in the list', async () => {
    sessionStorage.setItem('active_branch_id', 'invalid_branch_id');
    const { result } = renderHook(() => useBranch(), { wrapper: makeWrapper('OWNER') });

    await waitFor(() => expect(result.current.availableBranches.length).toBe(2));
    expect(result.current.selectedBranchId).toBe('ALL');
  });
});

// ─── Non-owner branch loading ─────────────────────────────────────────────────

describe('BranchProvider — non-OWNER user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('should filter branches to only user-assigned branches', async () => {
    // User is assigned to branch1 only
    const { result } = renderHook(() => useBranch(), {
      wrapper: makeWrapper('TELECALLER', [{ _id: 'branch1' }], 'branch1')
    });

    await waitFor(() => expect(result.current.availableBranches.length).toBeGreaterThan(0));
    const ids = result.current.availableBranches.map((b) => b._id);
    expect(ids).toContain('branch1');
    expect(ids).not.toContain('branch2');
  });

  it('should set selectedBranchId to first branch when no sessionStorage entry', async () => {
    const { result } = renderHook(() => useBranch(), {
      wrapper: makeWrapper('TELECALLER', [{ _id: 'branch1' }], 'branch1')
    });

    await waitFor(() => expect(result.current.availableBranches.length).toBeGreaterThan(0));
    expect(result.current.selectedBranchId).toBe('branch1');
  });
});

// ─── Unauthenticated user ─────────────────────────────────────────────────────

describe('BranchProvider — unauthenticated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('should clear branches and set ALL when user is null', async () => {
    useAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useBranch(), {
      wrapper: ({ children }) => <BranchProvider>{children}</BranchProvider>
    });

    await waitFor(() => expect(result.current.availableBranches).toEqual([]));
    expect(result.current.selectedBranchId).toBe('ALL');
  });
});

// ─── selectBranch() ───────────────────────────────────────────────────────────

describe('BranchProvider — selectBranch()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('should update selectedBranchId and write to sessionStorage', async () => {
    const invalidateQueries = vi.fn();
    useQueryClient.mockReturnValue({ invalidateQueries });

    const { result } = renderHook(() => useBranch(), { wrapper: makeWrapper('OWNER') });
    await waitFor(() => expect(result.current.availableBranches.length).toBe(2));

    act(() => {
      result.current.selectBranch('branch2');
    });

    expect(result.current.selectedBranchId).toBe('branch2');
    expect(sessionStorage.getItem('active_branch_id')).toBe('branch2');
    expect(invalidateQueries).toHaveBeenCalled();
  });

  it('should default to ALL when null is passed to selectBranch', async () => {
    const { result } = renderHook(() => useBranch(), { wrapper: makeWrapper('OWNER') });
    await waitFor(() => expect(result.current.availableBranches.length).toBe(2));

    act(() => {
      result.current.selectBranch(null);
    });

    expect(result.current.selectedBranchId).toBe('ALL');
  });
});

// ─── useBranch guard ─────────────────────────────────────────────────────────

describe('useBranch guard', () => {
  it('should throw when used outside BranchProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useBranch())).toThrow(
      'useBranch must be used within a BranchProvider'
    );
    spy.mockRestore();
  });
});
