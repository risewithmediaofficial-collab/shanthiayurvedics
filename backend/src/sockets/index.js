import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let ioInstance = null;

export const initSocketIO = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: [
        env.FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173'
      ],
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // Socket Authentication Middleware
  ioInstance.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        // Allow unauthenticated connection in development if needed, or enforce token
        if (env.NODE_ENV === 'development' && !socket.handshake.auth?.requireAuth) {
          socket.user = { isAnonymous: true };
          return next();
        }
        return next(new Error('Authentication error: Token required'));
      }

      jwt.verify(token, env.JWT_ACCESS_SECRET, (err, decoded) => {
        if (err) {
          return next(new Error('Authentication error: Invalid or expired token'));
        }
        socket.user = decoded;
        next();
      });
    } catch (err) {
      next(new Error(`Socket authentication error: ${err.message}`));
    }
  });

  ioInstance.on('connection', (socket) => {
    if (socket.user && !socket.user.isAnonymous) {
      const { userId, role, branchId, branchIds } = socket.user;
      
      // Join personal user room
      if (userId) {
        socket.join(`user:${userId}`);
      }

      // Join role room
      if (role) {
        socket.join(`role:${role}`);
      }

      // Join primary branch room
      if (branchId) {
        socket.join(`branch:${branchId}`);
      }

      // Join multiple authorized branch rooms if Owner / multi-branch manager
      if (Array.isArray(branchIds)) {
        branchIds.forEach((bId) => {
          socket.join(`branch:${bId}`);
        });
      }

      logger.info(`🔌 Socket connected: User ${userId || 'anonymous'} (${role || 'guest'}) joined rooms`);
    }

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
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, data);
  }
};

export const emitToBranch = (branchId, event, data) => {
  if (ioInstance) {
    ioInstance.to(`branch:${branchId}`).emit(event, data);
  }
};

export const emitToRole = (role, event, data) => {
  if (ioInstance) {
    ioInstance.to(`role:${role}`).emit(event, data);
  }
};

export const emitToAll = (event, data) => {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
};
