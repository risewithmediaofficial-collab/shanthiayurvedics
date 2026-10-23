import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let ioInstance = null;

/**
 * Extracts authentication token from socket handshake auth, headers, or cookies.
 */
export const extractTokenFromHandshake = (socket) => {
  // 1. Handshake auth payload
  if (socket.handshake.auth?.token) {
    return socket.handshake.auth.token;
  }

  // 2. Authorization header (Bearer token)
  const authHeader = socket.handshake.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  // 3. Cookie header (accessToken)
  const cookieHeader = socket.handshake.headers?.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
};

/**
 * Format payload ensuring eventId and timestamp for frontend deduplication.
 */
export const formatPayload = (data) => {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return {
      ...data,
      eventId: data.eventId || randomUUID(),
      timestamp: data.timestamp || Date.now()
    };
  }
  return {
    data,
    eventId: randomUUID(),
    timestamp: Date.now()
  };
};

/**
 * Helper to join user, role, branch, and org rooms
 */
export const joinUserRooms = (socket) => {
  if (!socket.user || socket.user.isAnonymous) return;
  const userId = socket.user.userId || socket.user.id || socket.user._id;
  const role = socket.user.role;
  const branchId = socket.user.branchId;
  const branches = socket.user.branches || socket.user.branchIds || [];

  // Join personal user room
  if (userId) {
    socket.join(`user:${userId.toString()}`);
  }

  // Join role room
  if (role) {
    socket.join(`role:${role}`);
  }

  // Join primary branch room
  if (branchId) {
    const bIdStr = typeof branchId === 'object' && branchId?._id ? branchId._id.toString() : branchId.toString();
    socket.join(`branch:${bIdStr}`);
  }

  // Join multiple assigned branches if present
  if (Array.isArray(branches)) {
    branches.forEach((b) => {
      const bId = typeof b === 'object' && b?._id ? b._id.toString() : b?.toString();
      if (bId) {
        socket.join(`branch:${bId}`);
      }
    });
  }

  // OWNER role has global multi-branch oversight
  if (role === 'OWNER') {
    socket.join('org:all');
  }

  logger.info(`🔌 Socket joined rooms: User ${userId || 'anonymous'} (${role || 'guest'})`);
};

/**
 * Socket.IO Authentication Middleware
 */
export const socketAuthMiddleware = (socket, next) => {
  try {
    const token = extractTokenFromHandshake(socket);

    if (!token) {
      if (socket.handshake.auth?.requireAuth) {
        return next(new Error('Authentication error: Token required'));
      }
      socket.user = { isAnonymous: true };
      return next();
    }

    jwt.verify(token, env.JWT_ACCESS_SECRET, (err, decoded) => {
      if (err) {
        if (socket.handshake.auth?.requireAuth !== false) {
          return next(new Error('Authentication error: Invalid or expired token'));
        }
        socket.user = { isAnonymous: true };
        return next();
      }
      socket.user = decoded;
      next();
    });
  } catch (err) {
    if (socket.handshake.auth?.requireAuth !== false) {
      return next(new Error(`Socket authentication error: ${err.message}`));
    }
    socket.user = { isAnonymous: true };
    next();
  }
};

export const initSocketIO = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, same-origin)
        if (!origin) return callback(null, true);
        const allowed = [
          ...env.FRONTEND_URL.split(',').map((u) => u.trim()),
          'https://shanthiayurvedas.com',
          'https://www.shanthiayurvedas.com',
          'http://shanthiayurvedas.com',
          'http://www.shanthiayurvedas.com',
          'http://82.29.166.169:8087',
          'http://localhost:5173',
          'http://localhost:3000',
          'http://localhost:80',
          'http://localhost:89',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:8087'
        ];
        if (
          allowed.includes(origin) ||
          /^https?:\/\/([a-zA-Z0-9-]+\.)?shanthiayurvedas\.com(:\d+)?$/.test(origin) ||
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Socket Authentication Middleware
  ioInstance.use(socketAuthMiddleware);

  ioInstance.on('connection', (socket) => {
    if (socket.user && !socket.user.isAnonymous) {
      joinUserRooms(socket);
    }

    // Allow post-connection authentication
    socket.on('crm:authenticate', (data) => {
      const token = data?.token || (typeof data === 'string' ? data : null);
      if (!token) return;
      jwt.verify(token, env.JWT_ACCESS_SECRET, (err, decoded) => {
        if (!err && decoded) {
          socket.user = decoded;
          joinUserRooms(socket);
          socket.emit('crm:authenticated', { success: true, userId: decoded.userId || decoded.id });
        }
      });
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  return ioInstance;
};

export const getIO = () => {
  if (!ioInstance) {
    logger.warn('Socket.IO not initialized yet');
  }
  return ioInstance;
};

export const emitToUser = (userId, event, data) => {
  if (ioInstance && userId) {
    const payload = formatPayload(data);
    ioInstance.to(`user:${userId.toString()}`).emit(event, payload);
  }
};

export const emitToBranch = (branchId, event, data) => {
  if (ioInstance) {
    const payload = formatPayload(data);
    if (branchId) {
      const bIdStr = typeof branchId === 'object' && branchId?._id ? branchId._id.toString() : branchId.toString();
      // Emit to specific branch room AND organization-wide room (for Owners)
      ioInstance.to(`branch:${bIdStr}`).to('org:all').emit(event, payload);
    } else {
      ioInstance.to('org:all').emit(event, payload);
    }
  }
};

export const emitToRole = (role, event, data) => {
  if (ioInstance && role) {
    const payload = formatPayload(data);
    ioInstance.to(`role:${role}`).emit(event, payload);
  }
};

export const emitToAll = (event, data) => {
  if (ioInstance) {
    const payload = formatPayload(data);
    ioInstance.emit(event, payload);
  }
};

