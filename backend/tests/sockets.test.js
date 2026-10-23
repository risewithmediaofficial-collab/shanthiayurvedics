import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import {
  initSocketIO,
  getIO,
  socketAuthMiddleware,
  emitToUser,
  emitToBranch,
  emitToRole,
  emitToAll
} from '../src/sockets/index.js';
import { env } from '../src/config/env.js';
import './setup.js';

describe('Socket.IO Real-Time Server & Authentication', () => {
  let server;
  let io;

  beforeAll(() => {
    server = http.createServer();
    io = initSocketIO(server);
  });

  afterAll(async () => {
    if (io) {
      await new Promise((resolve) => io.close(resolve));
    }
  });

  it('initializes Socket.IO instance and makes it accessible via getIO()', () => {
    expect(io).toBeDefined();
    expect(getIO()).toBe(io);
  });

  describe('Handshake Authentication Middleware', () => {
    it('rejects connection if token is missing and requireAuth is true', () => {
      const fakeSocket = {
        handshake: {
          auth: { requireAuth: true },
          headers: {}
        }
      };
      const next = vi.fn();

      socketAuthMiddleware(fakeSocket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toContain('Authentication error: Token required');
    });

    it('rejects connection if token is expired or invalid', () => {
      const fakeSocket = {
        handshake: {
          auth: { token: 'invalid.jwt.token' },
          headers: {}
        }
      };
      const next = vi.fn();

      socketAuthMiddleware(fakeSocket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toContain('Invalid or expired token');
    });

    it('authenticates socket via auth.token and decodes payload', () => {
      const token = jwt.sign(
        { userId: 'u123', role: 'TELECALLER', branchId: 'b999' },
        env.JWT_ACCESS_SECRET
      );

      const fakeSocket = {
        handshake: {
          auth: { token },
          headers: {}
        }
      };
      const next = vi.fn();

      socketAuthMiddleware(fakeSocket, next);

      expect(next).toHaveBeenCalledWith();
      expect(fakeSocket.user).toBeDefined();
      expect(fakeSocket.user.userId).toBe('u123');
      expect(fakeSocket.user.role).toBe('TELECALLER');
    });

    it('authenticates socket via Bearer token in authorization header', () => {
      const token = jwt.sign(
        { userId: 'u456', role: 'MANAGER', branchId: 'b111' },
        env.JWT_ACCESS_SECRET
      );

      const fakeSocket = {
        handshake: {
          auth: {},
          headers: {
            authorization: `Bearer ${token}`
          }
        }
      };
      const next = vi.fn();

      socketAuthMiddleware(fakeSocket, next);

      expect(next).toHaveBeenCalledWith();
      expect(fakeSocket.user.userId).toBe('u456');
      expect(fakeSocket.user.role).toBe('MANAGER');
    });

    it('authenticates socket via accessToken cookie header', () => {
      const token = jwt.sign(
        { userId: 'u789', role: 'OWNER', branchId: 'b222', branches: ['b222', 'b333'] },
        env.JWT_ACCESS_SECRET
      );

      const fakeSocket = {
        handshake: {
          auth: {},
          headers: {
            cookie: `someCookie=abc; accessToken=${encodeURIComponent(token)}; otherCookie=123`
          }
        }
      };
      const next = vi.fn();

      socketAuthMiddleware(fakeSocket, next);

      expect(next).toHaveBeenCalledWith();
      expect(fakeSocket.user.userId).toBe('u789');
      expect(fakeSocket.user.role).toBe('OWNER');
    });
  });

  describe('Room Assignment and Multi-Tenant Isolation', () => {
    it('joins personal user room, role room, and branch rooms upon connection', () => {
      const joinedRooms = [];
      const fakeSocket = {
        id: 'sock-1',
        user: {
          userId: 'u100',
          role: 'TELECALLER',
          branchId: 'b555'
        },
        join: vi.fn((room) => joinedRooms.push(room)),
        on: vi.fn()
      };

      // Find the connection listener registered on io
      const connectionListeners = io.listeners('connection');
      const connectionHandler = connectionListeners[connectionListeners.length - 1];

      connectionHandler(fakeSocket);

      expect(fakeSocket.join).toHaveBeenCalledWith('user:u100');
      expect(fakeSocket.join).toHaveBeenCalledWith('role:TELECALLER');
      expect(fakeSocket.join).toHaveBeenCalledWith('branch:b555');
      // Non-owner should NOT join org:all
      expect(fakeSocket.join).not.toHaveBeenCalledWith('org:all');
    });

    it('joins org:all and multi-branch rooms when user is OWNER', () => {
      const joinedRooms = [];
      const fakeSocket = {
        id: 'sock-2',
        user: {
          userId: 'uOwner',
          role: 'OWNER',
          branchId: 'b1',
          branches: ['b1', 'b2', 'b3']
        },
        join: vi.fn((room) => joinedRooms.push(room)),
        on: vi.fn()
      };

      const connectionListeners = io.listeners('connection');
      const connectionHandler = connectionListeners[connectionListeners.length - 1];

      connectionHandler(fakeSocket);

      expect(fakeSocket.join).toHaveBeenCalledWith('user:uOwner');
      expect(fakeSocket.join).toHaveBeenCalledWith('role:OWNER');
      expect(fakeSocket.join).toHaveBeenCalledWith('branch:b1');
      expect(fakeSocket.join).toHaveBeenCalledWith('branch:b2');
      expect(fakeSocket.join).toHaveBeenCalledWith('branch:b3');
      expect(fakeSocket.join).toHaveBeenCalledWith('org:all');
    });
  });

  describe('Emission Helpers & Payload Sanitization', () => {
    it('emitToUser attaches eventId and timestamp and emits to user room', () => {
      const mockTo = vi.fn().mockReturnValue({ emit: vi.fn() });
      const origTo = io.to;
      io.to = mockTo;

      emitToUser('u123', 'notification:new', { title: 'Order Verified' });

      expect(mockTo).toHaveBeenCalledWith('user:u123');
      const emitCall = mockTo.mock.results[0].value.emit;
      expect(emitCall).toHaveBeenCalledWith(
        'notification:new',
        expect.objectContaining({
          title: 'Order Verified',
          eventId: expect.any(String),
          timestamp: expect.any(Number)
        })
      );

      io.to = origTo;
    });

    it('emitToBranch emits to branch room and org:all with eventId', () => {
      const mockChainEmit = vi.fn();
      const mockChainTo = vi.fn().mockReturnValue({ emit: mockChainEmit });
      const mockTo = vi.fn().mockReturnValue({ to: mockChainTo });
      const origTo = io.to;
      io.to = mockTo;

      emitToBranch('branch-77', 'order:created', { orderNumber: 'ORD-77' });

      expect(mockTo).toHaveBeenCalledWith('branch:branch-77');
      expect(mockChainTo).toHaveBeenCalledWith('org:all');
      expect(mockChainEmit).toHaveBeenCalledWith(
        'order:created',
        expect.objectContaining({
          orderNumber: 'ORD-77',
          eventId: expect.any(String),
          timestamp: expect.any(Number)
        })
      );

      io.to = origTo;
    });

    it('emitToRole emits to role room', () => {
      const mockTo = vi.fn().mockReturnValue({ emit: vi.fn() });
      const origTo = io.to;
      io.to = mockTo;

      emitToRole('OWNER', 'withdrawal:created', { amount: 5000 });

      expect(mockTo).toHaveBeenCalledWith('role:OWNER');
      const emitCall = mockTo.mock.results[0].value.emit;
      expect(emitCall).toHaveBeenCalledWith('withdrawal:created', expect.objectContaining({ amount: 5000 }));

      io.to = origTo;
    });

    it('emitToAll emits event to entire server instance', () => {
      const mockEmit = vi.fn();
      const origEmit = io.emit;
      io.emit = mockEmit;

      emitToAll('product:created', { productId: 'p1' });

      expect(mockEmit).toHaveBeenCalledWith('product:created', expect.objectContaining({ productId: 'p1' }));

      io.emit = origEmit;
    });
  });
});
