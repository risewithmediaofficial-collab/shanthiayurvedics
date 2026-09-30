/**
 * Unit tests for:
 *   - StateMachineService (validateOrderTransition, isDispatchedOrBeyond)
 *   - RbacService (getPermissionsForRole, hasPermission, initializeDefaultRoles)
 *   - AuditService (log, query)
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { StateMachineService } from '../src/services/stateMachineService.js';
import { RbacService } from '../src/services/rbacService.js';
import { AuditService } from '../src/services/auditService.js';
import { ROLES } from '../src/constants/roles.js';
import { PERMISSIONS } from '../src/constants/permissions.js';
import { ORDER_STATUS } from '../src/constants/orderStates.js';
import './setup.js';

// ─── StateMachineService ──────────────────────────────────────────────────────

describe('StateMachineService', () => {
  describe('validateOrderTransition()', () => {
    it('should return true when transitioning to the same status', () => {
      const result = StateMachineService.validateOrderTransition(
        ORDER_STATUS.PENDING,
        ORDER_STATUS.PENDING
      );
      expect(result).toBe(true);
    });

    it('should return true for a valid NEW -> CONFIRMED transition', () => {
      const result = StateMachineService.validateOrderTransition(
        ORDER_STATUS.NEW,
        ORDER_STATUS.CONFIRMED
      );
      expect(result).toBe(true);
    });

    it('should throw AppError for invalid transition', () => {
      expect(() => {
        StateMachineService.validateOrderTransition(
          ORDER_STATUS.DELIVERED,
          ORDER_STATUS.NEW
        );
      }).toThrow();
    });

    it('should throw with status 400 for invalid transition', () => {
      try {
        StateMachineService.validateOrderTransition(
          ORDER_STATUS.DELIVERED,
          ORDER_STATUS.CONFIRMED
        );
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).toBe(400);
      }
    });
  });

  describe('isDispatchedOrBeyond()', () => {
    it('should return true for DISPATCHED', () => {
      expect(StateMachineService.isDispatchedOrBeyond(ORDER_STATUS.DISPATCHED)).toBe(true);
    });

    it('should return true for DELIVERED', () => {
      expect(StateMachineService.isDispatchedOrBeyond(ORDER_STATUS.DELIVERED)).toBe(true);
    });

    it('should return true for IN_TRANSIT', () => {
      expect(StateMachineService.isDispatchedOrBeyond(ORDER_STATUS.IN_TRANSIT)).toBe(true);
    });

    it('should return true for RTO', () => {
      expect(StateMachineService.isDispatchedOrBeyond(ORDER_STATUS.RTO)).toBe(true);
    });

    it('should return false for NEW', () => {
      expect(StateMachineService.isDispatchedOrBeyond(ORDER_STATUS.NEW)).toBe(false);
    });

    it('should return false for CONFIRMED', () => {
      expect(StateMachineService.isDispatchedOrBeyond(ORDER_STATUS.CONFIRMED)).toBe(false);
    });
  });
});

// ─── RbacService ─────────────────────────────────────────────────────────────

describe('RbacService', () => {
  describe('getPermissionsForRole()', () => {
    it('should return ALL permissions for OWNER role', async () => {
      const permissions = await RbacService.getPermissionsForRole(ROLES.OWNER);
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
      // Owner should have every permission value
      const allPerms = Object.values(PERMISSIONS);
      allPerms.forEach((perm) => {
        expect(permissions).toContain(perm);
      });
    });

    it('should return an array (from DB or defaults) for TELECALLER', async () => {
      const permissions = await RbacService.getPermissionsForRole(ROLES.TELECALLER);
      expect(Array.isArray(permissions)).toBe(true);
    });

    it('should return an array for MANAGER', async () => {
      const permissions = await RbacService.getPermissionsForRole('MANAGER');
      expect(Array.isArray(permissions)).toBe(true);
    });

    it('should return empty array for unknown role', async () => {
      const permissions = await RbacService.getPermissionsForRole('UNKNOWN_ROLE');
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBe(0);
    });
  });

  describe('hasPermission()', () => {
    it('should return true for OWNER for any permission', async () => {
      const result = await RbacService.hasPermission(ROLES.OWNER, 'some.impossible.perm');
      expect(result).toBe(true);
    });

    it('should return true when role has the permission in DB/defaults', async () => {
      // TELECALLER permissions from default — check one that definitely exists
      const telecallerPerms = await RbacService.getPermissionsForRole(ROLES.TELECALLER);
      if (telecallerPerms.length > 0) {
        const result = await RbacService.hasPermission(ROLES.TELECALLER, telecallerPerms[0]);
        expect(result).toBe(true);
      }
    });

    it('should return false when role lacks the permission', async () => {
      const result = await RbacService.hasPermission(ROLES.TELECALLER, 'branches.delete');
      expect(result).toBe(false);
    });
  });
});

// ─── AuditService ─────────────────────────────────────────────────────────────

describe('AuditService', () => {
  describe('log()', () => {
    it('should create an audit log entry and return it', async () => {
      const entry = await AuditService.log({
        action: 'TEST_ACTION',
        module: 'test',
        resourceType: 'TestResource',
        resourceId: 'res123'
      });
      expect(entry).not.toBeNull();
      expect(entry.action).toBe('TEST_ACTION');
      expect(entry.module).toBe('test');
    });

    it('should redact sensitive fields from newValue', async () => {
      const entry = await AuditService.log({
        action: 'USER_UPDATE',
        module: 'auth',
        resourceType: 'User',
        newValue: { name: 'Alice', password: 'secret123', email: 'alice@test.com' }
      });
      expect(entry).not.toBeNull();
      expect(entry.newValue.password).toBe('[REDACTED]');
      expect(entry.newValue.name).toBe('Alice');
      expect(entry.newValue.email).toBe('alice@test.com');
    });

    it('should redact known sensitive fields by exact lowercase match', async () => {
      // SENSITIVE_FIELDS = ['password', 'passwordHash', 'refreshToken', 'token', 'secret', 'passwordResetToken']
      // The check is: SENSITIVE_FIELDS.includes(key.toLowerCase())
      // 'password'.toLowerCase() = 'password' → IN list → REDACTED
      // 'token'.toLowerCase() = 'token' → IN list → REDACTED
      // 'normalField'.toLowerCase() = 'normalfield' → NOT in list → kept
      const entry = await AuditService.log({
        action: 'USER_DELETE',
        module: 'auth',
        resourceType: 'User',
        oldValue: { password: 'plain_pass', token: 'abc', normalField: 'keep' }
      });
      expect(entry.oldValue.password).toBe('[REDACTED]');
      expect(entry.oldValue.token).toBe('[REDACTED]');
      expect(entry.oldValue.normalField).toBe('keep');
    });

    it('should retain an audit entry when resourceType is omitted', async () => {
      const entry = await AuditService.log({
        action: 'MINIMAL_ACTION',
        module: 'test'
      });
      expect(entry).not.toBeNull();
      expect(entry.resourceType).toBe('test');
    });
  });

  describe('query()', () => {
    it('should return an object with logs array, total, and pagination info', async () => {
      const result = await AuditService.query({ page: 1, limit: 10, module: 'test' });
      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
      expect(Array.isArray(result.logs)).toBe(true);
    });

    it('should filter by module', async () => {
      // Create two entries with different modules
      await AuditService.log({ action: 'A1', module: 'orders' });
      await AuditService.log({ action: 'A2', module: 'unique_module_xyz' });

      const result = await AuditService.query({ module: 'unique_module_xyz', limit: 50 });
      expect(result.logs.every((l) => l.module === 'unique_module_xyz')).toBe(true);
    });

    it('should compute totalPages correctly', async () => {
      const result = await AuditService.query({ page: 1, limit: 5 });
      const expectedPages = Math.ceil(result.total / 5);
      expect(result.totalPages).toBe(expectedPages);
    });
  });
});
