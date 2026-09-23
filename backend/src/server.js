import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB, disconnectDB } from './config/db.js';
import { initSocketIO } from './sockets/index.js';
import { RbacService } from './services/rbacService.js';

const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocketIO(server);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Auto-initialize default system roles & permissions
    await RbacService.initializeDefaultRoles();

    server.listen(env.PORT, () => {
      logger.info(`🚀 Shanthi Ayurvedas CRM API running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`🔗 API Health URL: http://localhost:${env.PORT}/health`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`\nReceived ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed.');

    // Close Socket.IO
    if (io) {
      io.close(() => {
        logger.info('Socket.IO connections closed.');
      });
    }

    // Disconnect MongoDB
    await disconnectDB();

    logger.info('Graceful shutdown completed successfully. Exiting.');
    process.exit(0);
  });

  // Force close after 10s timeout
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { server, io };
