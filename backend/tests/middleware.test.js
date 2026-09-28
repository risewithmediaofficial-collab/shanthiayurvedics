/**
 * Unit tests for backend middleware:
 *   - rbac.js (requirePermission, requireAnyPermission, requireRole)
 *   - branchScope.js (requireBranchScope)
 *   - validate.js (validate Zod schema middleware)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requirePermission, requireAnyPermission, requireRole } from '../src/middleware/rbac.js';
import { requireBranchScope } from '../src/middleware/branchScope.js';
import { validate } from '../src/middleware/validate.js';
import { ROLES } from '../src/constants/roles.js';
import { z } from 'zod';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildReq(overrides = {}) {
  return {
    user: null,
    headers: {},
    query: {},
    body: {},
    ...overrides
  };
}

function buildNext() {
  return vi.fn();
}

// ─── requirePermission ────────────────────────────────────────────────────────

describe('requirePermission', () => {
  it('should call next(ForbiddenError) when req.user is null', () => {
    const req = buildReq({ user: null });
    const next = buildNext();
    requirePermission('orders.view')(req, {}, next);
    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('should pass through for OWNER without checking permissions', () => {
    const req = buildReq({ user: { role: ROLES.OWNER, permissions: [] } });
    const next = buildNext();
    requirePermission('orders.delete')(req, {}, next);
    expect(next).toHaveBeenCalledWith(); // called with no args = pass
  });

  it('should pass through when user has the required permission', () => {
    const req = buildReq({ user: { role: ROLES.TELECALLER, permissions: ['orders.view'] } });
    const next = buildNext();
    requirePermission('orders.view')(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should call next(ForbiddenError) when user lacks the required permission', () => {
    const req = buildReq({ user: { role: ROLES.TELECALLER, permissions: ['orders.view'] } });
    const next = buildNext();
    requirePermission('orders.delete')(req, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
    expect(next.mock.calls[0][0].message).toContain('orders.delete');
  });
});

// ─── requireAnyPermission ─────────────────────────────────────────────────────

describe('requireAnyPermission', () => {
  it('should pass when user has at least one of the permissions', () => {
    const req = buildReq({
      user: { role: ROLES.TELECALLER, permissions: ['leads.create', 'orders.view'] }
    });
    const next = buildNext();
    requireAnyPermission(['orders.view', 'orders.delete'])(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should block when user has none of the permissions', () => {
    const req = buildReq({
      user: { role: ROLES.TELECALLER, permissions: ['leads.view'] }
    });
    const next = buildNext();
    requireAnyPermission(['orders.view', 'orders.delete'])(req, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('should pass for OWNER always', () => {
    const req = buildReq({ user: { role: ROLES.OWNER, permissions: [] } });
    const next = buildNext();
    requireAnyPermission(['some.impossible.perm'])(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });
});

// ─── requireRole ─────────────────────────────────────────────────────────────

describe('requireRole', () => {
  it('should pass for OWNER regardless of the required roles list', () => {
    const req = buildReq({ user: { role: ROLES.OWNER } });
    const next = buildNext();
    requireRole('MANAGER')(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should pass when the user role is in the required roles', () => {
    const req = buildReq({ user: { role: 'MANAGER' } });
    const next = buildNext();
    requireRole('MANAGER', 'TELECALLER')(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should block when the user role is NOT in required roles', () => {
    const req = buildReq({ user: { role: 'TELECALLER' } });
    const next = buildNext();
    requireRole('MANAGER')(req, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('should call next(ForbiddenError) when req.user is null', () => {
    const req = buildReq({ user: null });
    const next = buildNext();
    requireRole('MANAGER')(req, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});

// ─── requireBranchScope ──────────────────────────────────────────────────────

describe('requireBranchScope', () => {
  it('should block unauthenticated request', () => {
    const req = buildReq({ user: null });
    const next = buildNext();
    requireBranchScope(req, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('should set isGlobal:true for OWNER with no explicit branch header', () => {
    const req = buildReq({
      user: { role: ROLES.OWNER, branchId: 'b1', branches: [] },
      headers: {}
    });
    const next = buildNext();
    requireBranchScope(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.branchScope.isGlobal).toBe(true);
    expect(req.branchScope.branchId).toBeNull();
  });

  it('should set specific branchId for OWNER when x-branch-id header is provided', () => {
    const req = buildReq({
      user: { role: ROLES.OWNER, branchId: 'b1', branches: [] },
      headers: { 'x-branch-id': 'b2' }
    });
    const next = buildNext();
    requireBranchScope(req, {}, next);
    expect(req.branchScope.branchId).toBe('b2');
    expect(req.branchScope.isGlobal).toBe(false);
  });

  it('should assign branchScope for non-owner with their branch', () => {
    const req = buildReq({
      user: { role: 'TELECALLER', branchId: 'branch123', branches: [] },
      headers: {}
    });
    const next = buildNext();
    requireBranchScope(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.branchScope.branchId).toBe('branch123');
  });

  it('should block non-owner from accessing unauthorized branch', () => {
    const req = buildReq({
      user: { role: 'TELECALLER', branchId: 'branchA', branches: [] },
      headers: { 'x-branch-id': 'branchB' }
    });
    const next = buildNext();
    requireBranchScope(req, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
    expect(next.mock.calls[0][0].message).toContain('Unauthorized branch access');
  });

  it('should block non-owner with no branch assigned', () => {
    const req = buildReq({
      user: { role: 'TELECALLER', branchId: null, branches: [] },
      headers: {}
    });
    const next = buildNext();
    requireBranchScope(req, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});

// ─── validate middleware ──────────────────────────────────────────────────────

describe('validate middleware', () => {
  it('should call next() with no error on valid body', async () => {
    const schema = {
      body: z.object({ name: z.string().min(1) })
    };
    const req = buildReq({ body: { name: 'Test' } });
    const next = buildNext();
    await validate(schema)(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body.name).toBe('Test');
  });

  it('should call next(ValidationError) for invalid body', async () => {
    const schema = {
      body: z.object({ name: z.string().min(1) })
    };
    const req = buildReq({ body: { name: '' } });
    const next = buildNext();
    await validate(schema)(req, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(422);
  });

  it('should validate query params', async () => {
    const schema = {
      query: z.object({ page: z.string().regex(/^\d+$/) })
    };
    const req = buildReq({ query: { page: '1' } });
    const next = buildNext();
    await validate(schema)(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should validate route params', async () => {
    const schema = {
      params: z.object({ id: z.string().min(1) })
    };
    const req = { body: {}, query: {}, params: { id: 'abc123' }, headers: {} };
    const next = buildNext();
    await validate(schema)(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should fail validation on invalid params', async () => {
    const schema = {
      params: z.object({ id: z.string().min(1) })
    };
    const req = { body: {}, query: {}, params: { id: '' }, headers: {} };
    const next = buildNext();
    await validate(schema)(req, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(422);
  });
});
