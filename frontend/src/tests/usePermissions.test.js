/**
 * Unit tests for the usePermissions hook
 * from src/hooks/usePermissions.js
 *
 * Tests every exported function with different user roles and permission sets.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions } from '../hooks/usePermissions.js';

// ── We must mock useAuth since hooks cannot be called outside providers ────────
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../context/AuthContext.jsx';

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderWithUser(userOverrides) {
  useAuth.mockReturnValue({ user: userOverrides });
  return renderHook(() => usePermissions());
}

// ─── Role flags ───────────────────────────────────────────────────────────────

describe('usePermissions — role flags', () => {
  it('should set isOwner=true for OWNER role', () => {
    const { result } = renderWithUser({ role: 'OWNER', permissions: [] });
    expect(result.current.isOwner).toBe(true);
    expect(result.current.isDistributor).toBe(false);
    expect(result.current.isManager).toBe(false);
    expect(result.current.isTelecaller).toBe(false);
  });

  it('should set isDistributor=true for DISTRIBUTOR role', () => {
    const { result } = renderWithUser({ role: 'DISTRIBUTOR', permissions: [] });
    expect(result.current.isDistributor).toBe(true);
    expect(result.current.isOwner).toBe(false);
  });

  it('should set isManager=true for MANAGER role', () => {
    const { result } = renderWithUser({ role: 'MANAGER', permissions: [] });
    expect(result.current.isManager).toBe(true);
  });

  it('should set isTelecaller=true for TELECALLER role', () => {
    const { result } = renderWithUser({ role: 'TELECALLER', permissions: ['orders.view'] });
    expect(result.current.isTelecaller).toBe(true);
  });

  it('should handle null user gracefully', () => {
    const { result } = renderWithUser(null);
    expect(result.current.isOwner).toBe(false);
    expect(result.current.role).toBeUndefined();
    expect(result.current.permissions).toEqual([]);
  });
});

// ─── hasPermission ────────────────────────────────────────────────────────────

describe('usePermissions — hasPermission()', () => {
  it('should return true for OWNER regardless of permission', () => {
    const { result } = renderWithUser({ role: 'OWNER', permissions: [] });
    expect(result.current.hasPermission('orders.delete')).toBe(true);
    expect(result.current.hasPermission('admin.destroy_world')).toBe(true);
  });

  it('should require an actual grant for MANAGER', () => {
    const { result } = renderWithUser({ role: 'MANAGER', permissions: [] });
    expect(result.current.hasPermission('orders.view')).toBe(false);
  });

  it('should require an actual grant for DISTRIBUTOR', () => {
    const { result } = renderWithUser({ role: 'DISTRIBUTOR', permissions: [] });
    expect(result.current.hasPermission('inventory.view')).toBe(false);
  });

  it('restores the standard telecaller desk for a session without grants', () => {
    const { result } = renderWithUser({ role: 'TELECALLER' });
    expect(result.current.hasPermission('leads.view')).toBe(true);
    expect(result.current.hasPermission('followups.view')).toBe(true);
    expect(result.current.hasPermission('orders.create')).toBe(true);
    expect(result.current.hasPermission('branches.manage')).toBe(false);
  });

  it('should return true for TELECALLER when they have the permission', () => {
    const { result } = renderWithUser({ role: 'TELECALLER', permissions: ['orders.view', 'leads.create'] });
    expect(result.current.hasPermission('orders.view')).toBe(true);
    expect(result.current.hasPermission('leads.create')).toBe(true);
  });

  it('should return false for TELECALLER when they lack the permission', () => {
    const { result } = renderWithUser({ role: 'TELECALLER', permissions: ['orders.view'] });
    expect(result.current.hasPermission('orders.delete')).toBe(false);
  });

  it('should return true when permission is null/undefined (no restriction)', () => {
    const { result } = renderWithUser({ role: 'TELECALLER', permissions: [] });
    expect(result.current.hasPermission(null)).toBe(true);
    expect(result.current.hasPermission(undefined)).toBe(true);
    expect(result.current.hasPermission('')).toBe(true);
  });
});

// ─── hasAnyPermission ─────────────────────────────────────────────────────────

describe('usePermissions — hasAnyPermission()', () => {
  it('should return true when owner calls with any permissions list', () => {
    const { result } = renderWithUser({ role: 'OWNER', permissions: [] });
    expect(result.current.hasAnyPermission(['perm.a', 'perm.b'])).toBe(true);
  });

  it('should return true when user has at least one of the permissions', () => {
    const { result } = renderWithUser({ role: 'TELECALLER', permissions: ['orders.view', 'leads.view'] });
    expect(result.current.hasAnyPermission(['orders.view', 'orders.delete'])).toBe(true);
  });

  it('should return false when user has none of the permissions', () => {
    const { result } = renderWithUser({ role: 'TELECALLER', permissions: ['leads.view'] });
    expect(result.current.hasAnyPermission(['orders.view', 'orders.delete'])).toBe(false);
  });

  it('should return true when permissions array is empty (no restriction)', () => {
    const { result } = renderWithUser({ role: 'TELECALLER', permissions: [] });
    expect(result.current.hasAnyPermission([])).toBe(true);
    expect(result.current.hasAnyPermission(null)).toBe(true);
  });
});

// ─── hasAllPermissions ────────────────────────────────────────────────────────

describe('usePermissions — hasAllPermissions()', () => {
  it('should return true for OWNER with any permissions list', () => {
    const { result } = renderWithUser({ role: 'OWNER', permissions: [] });
    expect(result.current.hasAllPermissions(['perm.a', 'perm.b'])).toBe(true);
  });

  it('should return true when user has all requested permissions', () => {
    const { result } = renderWithUser({
      role: 'TELECALLER',
      permissions: ['orders.view', 'leads.view', 'leads.create']
    });
    expect(result.current.hasAllPermissions(['orders.view', 'leads.view'])).toBe(true);
  });

  it('should return false when user is missing at least one permission', () => {
    const { result } = renderWithUser({ role: 'TELECALLER', permissions: ['orders.view'] });
    expect(result.current.hasAllPermissions(['orders.view', 'orders.delete'])).toBe(false);
  });

  it('should return true when permissions array is empty', () => {
    const { result } = renderWithUser({ role: 'TELECALLER', permissions: [] });
    expect(result.current.hasAllPermissions([])).toBe(true);
  });
});

// ─── permissions array ────────────────────────────────────────────────────────

describe('usePermissions — permissions array', () => {
  it('should expose the user permissions array', () => {
    const { result } = renderWithUser({ role: 'TELECALLER', permissions: ['orders.view'] });
    expect(result.current.permissions).toEqual(['orders.view']);
  });

  it('should restore standard telecaller grants when an old session has no permissions field', () => {
    const { result } = renderWithUser({ role: 'TELECALLER' });
    expect(result.current.permissions).toContain('leads.view');
    expect(result.current.permissions).not.toContain('branches.manage');
  });

  it('allows MANAGER to manage stock but forbids creating products', () => {
    const { result } = renderWithUser({ role: 'MANAGER' });
    expect(result.current.hasPermission('inventory.view')).toBe(true);
    expect(result.current.hasPermission('inventory.manage')).toBe(true);
    expect(result.current.hasPermission('inventory.adjust')).toBe(true);
    expect(result.current.hasPermission('inventory.transfer')).toBe(true);
    expect(result.current.hasPermission('products.view')).toBe(true);
    // Crucial requirement: Manager CANNOT add products
    expect(result.current.hasPermission('products.create')).toBe(false);
    expect(result.current.hasPermission('products.edit')).toBe(false);
  });

  it('allows DISTRIBUTOR ONLY total sales, stocks available, telecaller access, each telecaller sales and removes all other permissions', () => {
    const { result } = renderWithUser({ role: 'DISTRIBUTOR' });
    // 1. Total Sales & Each Telecaller Sales
    expect(result.current.hasPermission('orders.view')).toBe(true);
    expect(result.current.hasPermission('reports.view')).toBe(true);
    // 2. Stocks Available
    expect(result.current.hasPermission('inventory.view')).toBe(true);
    expect(result.current.hasPermission('products.view')).toBe(true);
    // 3. Telecaller Access
    expect(result.current.hasPermission('users.view')).toBe(true);
    expect(result.current.hasPermission('leads.view')).toBe(true);
    expect(result.current.hasPermission('followups.view')).toBe(true);

    // REMAINING ALL ACCESS STRICTLY REMOVED:
    expect(result.current.hasPermission('orders.create')).toBe(false);
    expect(result.current.hasPermission('orders.edit')).toBe(false);
    expect(result.current.hasPermission('orders.delete')).toBe(false);
    expect(result.current.hasPermission('customers.view')).toBe(false);
    expect(result.current.hasPermission('customers.create')).toBe(false);
    expect(result.current.hasPermission('leads.create')).toBe(false);
    expect(result.current.hasPermission('inventory.manage')).toBe(false);
    expect(result.current.hasPermission('inventory.transfer')).toBe(false);
    expect(result.current.hasPermission('shipping.view')).toBe(false);
    expect(result.current.hasPermission('delivery.view')).toBe(false);
    expect(result.current.hasPermission('rto.view')).toBe(false);
    expect(result.current.hasPermission('reports.export')).toBe(false);
  });
});



