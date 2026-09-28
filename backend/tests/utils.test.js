/**
 * Unit tests for backend utility functions:
 *   - ApiResponse (success, created, paginated, error)
 *   - AppError and all custom error classes
 *   - asyncHandler
 *   - withTransaction (transactionHelper)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiResponse } from '../src/utils/apiResponse.js';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError
} from '../src/utils/errors.js';
import { asyncHandler } from '../src/utils/asyncHandler.js';
import { withTransaction } from '../src/utils/transactionHelper.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Create a minimal express-like mock response */
function mockRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    }
  };
  return res;
}

// ─── ApiResponse ─────────────────────────────────────────────────────────────

describe('ApiResponse', () => {
  describe('success()', () => {
    it('should return 200 with success:true and provided data', () => {
      const res = mockRes();
      ApiResponse.success(res, { id: 1 }, 'OK');
      expect(res._status).toBe(200);
      expect(res._body.success).toBe(true);
      expect(res._body.message).toBe('OK');
      expect(res._body.data).toEqual({ id: 1 });
    });

    it('should include meta when provided', () => {
      const res = mockRes();
      ApiResponse.success(res, [], 'Done', 200, { count: 0 });
      expect(res._body.meta).toEqual({ count: 0 });
    });

    it('should NOT include meta key when meta is null', () => {
      const res = mockRes();
      ApiResponse.success(res, null, 'Done', 200, null);
      expect(res._body.meta).toBeUndefined();
    });

    it('should use custom status codes', () => {
      const res = mockRes();
      ApiResponse.success(res, null, 'Accepted', 202);
      expect(res._status).toBe(202);
    });
  });

  describe('created()', () => {
    it('should return 201 status', () => {
      const res = mockRes();
      ApiResponse.created(res, { id: 'abc' });
      expect(res._status).toBe(201);
      expect(res._body.success).toBe(true);
      expect(res._body.data).toEqual({ id: 'abc' });
    });

    it('should use default message when none provided', () => {
      const res = mockRes();
      ApiResponse.created(res, {});
      expect(res._body.message).toBe('Resource created successfully');
    });
  });

  describe('paginated()', () => {
    it('should return 200 with pagination block', () => {
      const res = mockRes();
      ApiResponse.paginated(res, [1, 2], { page: 1, limit: 10, total: 2 });
      expect(res._status).toBe(200);
      expect(res._body.success).toBe(true);
      expect(res._body.pagination.page).toBe(1);
      expect(res._body.pagination.limit).toBe(10);
      expect(res._body.pagination.total).toBe(2);
      expect(res._body.pagination.totalPages).toBe(1);
    });

    it('should compute totalPages correctly', () => {
      const res = mockRes();
      ApiResponse.paginated(res, [], { page: 2, limit: 10, total: 25 });
      expect(res._body.pagination.totalPages).toBe(3);
    });

    it('should default to page 1, limit 20, total 0 when not provided', () => {
      const res = mockRes();
      ApiResponse.paginated(res, []);
      expect(res._body.pagination.page).toBe(1);
      expect(res._body.pagination.limit).toBe(20);
      expect(res._body.pagination.total).toBe(0);
      expect(res._body.pagination.totalPages).toBe(0);
    });
  });

  describe('error()', () => {
    it('should return 500 with success:false by default', () => {
      const res = mockRes();
      ApiResponse.error(res);
      expect(res._status).toBe(500);
      expect(res._body.success).toBe(false);
      expect(res._body.message).toBe('An error occurred');
    });

    it('should include errors array when provided', () => {
      const res = mockRes();
      ApiResponse.error(res, 'Bad input', 422, [{ field: 'email', message: 'required' }]);
      expect(res._status).toBe(422);
      expect(res._body.errors).toBeDefined();
      expect(res._body.errors[0].field).toBe('email');
    });

    it('should NOT include errors key when errors is null', () => {
      const res = mockRes();
      ApiResponse.error(res, 'Nope', 404, null);
      expect(res._body.errors).toBeUndefined();
    });
  });
});

// ─── Custom Error Classes ─────────────────────────────────────────────────────

describe('AppError', () => {
  it('should set message, statusCode, and isOperational', () => {
    const err = new AppError('Something broke', 503);
    expect(err.message).toBe('Something broke');
    expect(err.statusCode).toBe(503);
    expect(err.isOperational).toBe(true);
  });

  it('should set status to "fail" for 4xx codes', () => {
    const err = new AppError('Not found', 404);
    expect(err.status).toBe('fail');
  });

  it('should set status to "error" for 5xx codes', () => {
    const err = new AppError('Server error', 500);
    expect(err.status).toBe('error');
  });

  it('should default statusCode to 500', () => {
    const err = new AppError('Oops');
    expect(err.statusCode).toBe(500);
  });

  it('should store custom errors payload', () => {
    const err = new AppError('Validation', 422, [{ field: 'name' }]);
    expect(err.errors).toEqual([{ field: 'name' }]);
  });
});

describe('ValidationError', () => {
  it('should have statusCode 422', () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(422);
    expect(err.message).toBe('Validation failed');
  });

  it('should accept custom message and errors', () => {
    const err = new ValidationError('Invalid', [{ field: 'email' }]);
    expect(err.message).toBe('Invalid');
    expect(err.errors[0].field).toBe('email');
  });
});

describe('NotFoundError', () => {
  it('should have statusCode 404', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
  });

  it('should format message with resource name', () => {
    const err = new NotFoundError('Order');
    expect(err.message).toBe('Order not found');
  });

  it('should use explicit message when provided', () => {
    const err = new NotFoundError('Order', 'Cannot find this order');
    expect(err.message).toBe('Cannot find this order');
  });
});

describe('UnauthorizedError', () => {
  it('should have statusCode 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Not authenticated');
  });
});

describe('ForbiddenError', () => {
  it('should have statusCode 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
  });
});

describe('ConflictError', () => {
  it('should have statusCode 409', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('Resource already exists or conflict detected');
  });
});

// ─── asyncHandler ─────────────────────────────────────────────────────────────

describe('asyncHandler', () => {
  it('should call the wrapped function and pass its result through', async () => {
    const fn = vi.fn().mockResolvedValue('done');
    const req = {};
    const res = {};
    const next = vi.fn();

    const wrapped = asyncHandler(fn);
    await wrapped(req, res, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('should forward rejected errors to next()', async () => {
    const error = new Error('async failure');
    const fn = vi.fn().mockRejectedValue(error);
    const next = vi.fn();

    const wrapped = asyncHandler(fn);
    await wrapped({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

// ─── withTransaction ──────────────────────────────────────────────────────────

describe('withTransaction', () => {
  it('should run callback directly when no replica set is available', async () => {
    const callback = vi.fn().mockResolvedValue('result');
    const result = await withTransaction(callback);
    // In test environment with MongoMemoryServer (no replica set), should run without session
    expect(callback).toHaveBeenCalledWith(null);
    expect(result).toBe('result');
  });

  it('should propagate errors thrown inside callback', async () => {
    const error = new Error('callback error');
    const callback = vi.fn().mockRejectedValue(error);
    await expect(withTransaction(callback)).rejects.toThrow('callback error');
  });
});
