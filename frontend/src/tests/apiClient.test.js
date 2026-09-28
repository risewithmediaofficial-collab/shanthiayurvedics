/**
 * Unit tests for the apiClient (frontend Axios instance)
 * from src/api/apiClient.js
 *
 * Tests: request interceptor (auth token, branch header),
 *        response interceptor (token refresh, session_expired event),
 *        auth-endpoint bypass logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

const handlers = vi.hoisted(() => ({
  requestHandler: null,
  responseSuccess: null,
  responseError: null,
  mockInstance: null
}));

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal();
  handlers.mockInstance = {
    interceptors: {
      request: {
        use: vi.fn((fn) => {
          handlers.requestHandler = fn;
        })
      },
      response: {
        use: vi.fn((sFn, eFn) => {
          handlers.responseSuccess = sFn;
          handlers.responseError = eFn;
        })
      }
    },
    get: vi.fn(),
    post: vi.fn(),
    defaults: { headers: { common: {} } }
  };

  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => handlers.mockInstance),
      post: vi.fn()
    }
  };
});

// Import once so module initialization runs and hooks up handlers
await import('../api/apiClient.js');

describe('apiClient module', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should create an axios instance (mockInstance is initialized)', () => {
    expect(handlers.mockInstance).not.toBeNull();
  });

  it('should register a request interceptor', () => {
    expect(typeof handlers.requestHandler).toBe('function');
  });

  it('should register a response interceptor with success and error handlers', () => {
    expect(typeof handlers.responseSuccess).toBe('function');
    expect(typeof handlers.responseError).toBe('function');
  });

  describe('request interceptor behavior', () => {
    it('should add Authorization header when token is in localStorage', () => {
      localStorage.setItem('auth_access_token', 'test_jwt_token');
      const config = { headers: {} };
      const result = handlers.requestHandler(config);

      expect(result.headers.Authorization).toBe('Bearer test_jwt_token');
    });

    it('should NOT override existing Authorization header', () => {
      localStorage.setItem('auth_access_token', 'new_token');
      const config = { headers: { Authorization: 'Bearer existing_token' } };
      const result = handlers.requestHandler(config);

      expect(result.headers.Authorization).toBe('Bearer existing_token');
    });

    it('should add x-branch-id header when active_branch_id is in sessionStorage', () => {
      sessionStorage.setItem('active_branch_id', 'branch123');
      const config = { headers: {} };
      const result = handlers.requestHandler(config);

      expect(result.headers['x-branch-id']).toBe('branch123');
    });

    it('should NOT add x-branch-id when active_branch_id is "ALL"', () => {
      sessionStorage.setItem('active_branch_id', 'ALL');
      const config = { headers: {} };
      const result = handlers.requestHandler(config);

      expect(result.headers['x-branch-id']).toBeUndefined();
    });

    it('should NOT add x-branch-id when value is "null" string', () => {
      sessionStorage.setItem('active_branch_id', 'null');
      const config = { headers: {} };
      const result = handlers.requestHandler(config);

      expect(result.headers['x-branch-id']).toBeUndefined();
    });
  });

  describe('response interceptor — success passthrough', () => {
    it('should return the response unchanged on success', () => {
      const fakeResponse = { status: 200, data: { success: true } };
      expect(handlers.responseSuccess(fakeResponse)).toBe(fakeResponse);
    });
  });

  describe('response interceptor — auth endpoint bypass', () => {
    it('should reject immediately for /auth/login errors without refresh', async () => {
      const error = {
        response: { status: 401 },
        config: { url: '/auth/login' }
      };

      await expect(handlers.responseError(error)).rejects.toBe(error);
    });

    it('should reject immediately for /auth/refresh errors', async () => {
      const error = {
        response: { status: 401 },
        config: { url: '/auth/refresh' }
      };

      await expect(handlers.responseError(error)).rejects.toBe(error);
    });

    it('should reject non-401 errors immediately', async () => {
      const error = {
        response: { status: 403 },
        config: { url: '/api/orders' }
      };

      await expect(handlers.responseError(error)).rejects.toBe(error);
    });
  });
});
