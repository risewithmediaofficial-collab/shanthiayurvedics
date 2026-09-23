import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB, disconnectDB } from './config/db.js';
import { initSocketIO } from './sockets/index.js';
import { RbacService } from './services/rbacService.js';

import { seedComprehensiveData } from './scripts/seed.js';
import { deleteFakeData } from './scripts/deleteFakeData.js';
import { User } from './models/User.js';

const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocketIO(server);

// Global process safety handlers to prevent unhandled promise rejections from crashing the process
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, '⚠️ Unhandled Promise Rejection captured:');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, '⚠️ Uncaught Exception captured:');
});

// Start server
const startServer = async () => {
  try {
    // 1. Immediately start HTTP server so Nginx upstream has active listener
    server.listen(env.PORT, () => {
      logger.info(`🚀 Shanthi Ayurvedas CRM API running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`🔗 API Health URL: http://localhost:${env.PORT}/health`);
    });

    // 2. Connect to database with auto-retry
    await connectDB();

    // 3. Auto-initialize default system roles & permissions
    try {
      await RbacService.initializeDefaultRoles();
      logger.info('✅ System roles & permissions initialized.');
    } catch (roleErr) {
      logger.error(`⚠️ Default roles initialization error: ${roleErr.message}`);
    }

    // 4. Auto-bootstrap staff accounts, branches, and catalogue if database is empty or default admin is missing
    try {
      const userCount = await User.countDocuments();
      const adminExists = await User.exists({
        $or: [{ username: 'shanthi@369' }, { email: 'shanthi@shanthiayurvedas.com' }]
      });

      if (userCount === 0 || !adminExists) {
        logger.info(`🌱 Seeding initial staff accounts, branches & modules (userCount: ${userCount}, adminExists: ${Boolean(adminExists)})...`);
        await seedComprehensiveData();
        logger.info('✅ Initial database seed completed successfully!');
      } else {
        logger.info(`ℹ️ Database already initialized (${userCount} staff accounts registered).`);
      }
    } catch (seedErr) {
      logger.error(`⚠️ Initial database seeding error: ${seedErr.message}`);
    }

    // 5. Auto-purge any legacy fake seeded orders, leads or transactions
    try {
      const mongoose = await import('mongoose');
      const db = mongoose.default?.connection?.db || mongoose.connection?.db;
      if (db) {
        const ordersCol = await db.listCollections({ name: 'orders' }).toArray();
        if (ordersCol.length > 0) {
          const fakeOrderCount = await db.collection('orders').countDocuments({
            $or: [
              { orderNumber: { $regex: /^AYUR-HSR-10/ } },
              { orderNumber: { $regex: /^AYUR-HSR-0/ } }
            ]
          });
          if (fakeOrderCount > 0) {
            logger.info(`🧹 Found ${fakeOrderCount} fake seed orders. Auto-purging fake transactions for clean real-time stats...`);
            await deleteFakeData();
            logger.info('✅ Fake data purge complete! Database is clean, fresh, and real-time ready.');
          }
        }
      }
    } catch (cleanErr) {
      logger.warn(`Could not check/purge fake data on boot: ${cleanErr.message}`);
    }
  } catch (error) {
    logger.error(`Failed during server initialization: ${error.message}`);
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
