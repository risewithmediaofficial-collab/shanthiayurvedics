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
import { useQuery, useQueryClient } from '@tanstack/react-query';

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

  it('should load all branches for OWNER and default to Main Branch (branch1)', async () => {
    const { result } = renderHook(() => useBranch(), { wrapper: makeWrapper('OWNER') });

    await waitFor(() => expect(result.current.availableBranches.length).toBe(2));
    expect(result.current.selectedBranchId).toBe('branch1');
    expect(result.current.isOwner).toBe(true);
  });

  it('should restore saved branch from sessionStorage for OWNER', async () => {
    sessionStorage.setItem('active_branch_id', 'branch2');
    const { result } = renderHook(() => useBranch(), { wrapper: makeWrapper('OWNER') });

    await waitFor(() => expect(result.current.availableBranches.length).toBe(2));
    expect(result.current.selectedBranchId).toBe('branch2');
  });

  it('should fallback to Main Branch (branch1) when saved branch is not in the list or stale ALL', async () => {
    sessionStorage.setItem('active_branch_id', 'invalid_branch_id');
    const { result } = renderHook(() => useBranch(), { wrapper: makeWrapper('OWNER') });

    await waitFor(() => expect(result.current.availableBranches.length).toBe(2));
    expect(result.current.selectedBranchId).toBe('branch1');

    sessionStorage.setItem('active_branch_id', 'ALL');
    sessionStorage.removeItem('active_branch_explicit');
    const { result: staleAllResult } = renderHook(() => useBranch(), { wrapper: makeWrapper('OWNER') });
    await waitFor(() => expect(staleAllResult.current.selectedBranchId).toBe('branch1'));
  });

  it('should preserve saved branch2 while branches API is loading without overwriting sessionStorage with MAIN', async () => {
    sessionStorage.setItem('active_branch_id', 'branch2');
    sessionStorage.setItem('active_branch_explicit', 'true');

    useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isFetched: false
    });

    const { result, rerender } = renderHook(() => useBranch(), { wrapper: makeWrapper('OWNER') });
    expect(sessionStorage.getItem('active_branch_id')).toBe('branch2');
    expect(result.current.selectedBranchId).toBe('branch2');

    rerender();
    await waitFor(() => expect(result.current.availableBranches.length).toBe(2));
    expect(result.current.selectedBranchId).toBe('branch2');
    expect(sessionStorage.getItem('active_branch_id')).toBe('branch2');
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

  it('should clear branches and reset selectedBranchId when user is null', async () => {
    useAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useBranch(), {
      wrapper: ({ children }) => <BranchProvider>{children}</BranchProvider>
    });

    await waitFor(() => expect(result.current.availableBranches).toEqual([]));
    expect(result.current.selectedBranchId).toBe('');
  });
});

// ─── selectBranch() ───────────────────────────────────────────────────────────

describe('BranchProvider — selectBranch()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('should update selectedBranchId, write to sessionStorage, and keep branches cache intact', async () => {
    const clear = vi.fn();
    const removeQueries = vi.fn();
    const invalidateQueries = vi.fn();
    useQueryClient.mockReturnValue({ clear, removeQueries, invalidateQueries });

    const { result } = renderHook(() => useBranch(), { wrapper: makeWrapper('OWNER') });
    await waitFor(() => expect(result.current.selectedBranchId).toBe('branch1'));

    act(() => {
      result.current.selectBranch('branch2');
    });

    expect(result.current.selectedBranchId).toBe('branch2');
    expect(sessionStorage.getItem('active_branch_id')).toBe('branch2');
    expect(sessionStorage.getItem('active_branch_explicit')).toBe('true');
    expect(clear).not.toHaveBeenCalled();
    expect(removeQueries).toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalled();
    const predicate = invalidateQueries.mock.calls[0][0].predicate;
    expect(predicate({ queryKey: ['branches'] })).toBe(false);
    expect(predicate({ queryKey: ['orders'] })).toBe(true);
  });

  it('should allow explicitly switching to ALL without snapping back to main branch', async () => {
    const { result } = renderHook(() => useBranch(), { wrapper: makeWrapper('OWNER') });
    await waitFor(() => expect(result.current.selectedBranchId).toBe('branch1'));

    act(() => {
      result.current.selectBranch('ALL');
    });

    expect(result.current.selectedBranchId).toBe('ALL');
    expect(sessionStorage.getItem('active_branch_id')).toBe('ALL');
    expect(sessionStorage.getItem('active_branch_explicit')).toBe('true');
  });

  it('should default to Main Branch (branch1) when null is passed to selectBranch', async () => {
    const { result } = renderHook(() => useBranch(), { wrapper: makeWrapper('OWNER') });
    await waitFor(() => expect(result.current.availableBranches.length).toBe(2));

    act(() => {
      result.current.selectBranch('branch2');
    });
    expect(result.current.selectedBranchId).toBe('branch2');

    act(() => {
      result.current.selectBranch(null);
    });

    expect(result.current.selectedBranchId).toBe('branch1');
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
