import http from 'node:http';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB, disconnectDB } from './config/db.js';
import { initSocketIO } from './sockets/index.js';
import { RbacService } from './services/rbacService.js';

const server = http.createServer(app);
server.requestTimeout = 120000;
server.headersTimeout = 65000;
server.keepAliveTimeout = 60000;
const io = initSocketIO(server);
let shuttingDown = false;

const gracefulShutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  app.locals.isReady = false;
  logger.info({ signal }, 'Draining connections');
  const deadline = setTimeout(() => process.exit(1), 10000);
  deadline.unref();
  try {
    await new Promise((resolve) => io.close(resolve));
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
    clearTimeout(deadline);
    process.exit(exitCode);
  } catch (err) {
    logger.error({ err }, 'Shutdown failed');
    process.exit(1);
  }
};

import cron from 'node-cron';
import { ReorderService } from './services/reorderService.js';

const startServer = async () => {
  app.locals.isReady = false;
  // Start HTTP listener immediately so Nginx reverse-proxy and /health checks have an active socket
  server.listen(env.PORT, '0.0.0.0', () => logger.info({ port: env.PORT }, 'CRM API server listening'));
  try {
    await connectDB();
    await RbacService.initializeDefaultRoles();
    app.locals.isReady = true;
    logger.info({ port: env.PORT }, 'CRM API ready and database connected');

    // Initial check and recurring cron for 15-day reorder notifications
    ReorderService.checkAndCreateReorderNotifications().catch((err) => logger.warn({ err }, 'Initial reorder check error'));
    cron.schedule('0 */2 * * *', () => {
      ReorderService.checkAndCreateReorderNotifications().catch((err) => logger.warn({ err }, 'Cron reorder check error'));
    });
  } catch (err) {
    logger.error({ err }, 'Server initialization failed');
    await gracefulShutdown('STARTUP_FAILURE', 1);
  }
};
server.on('error', (err) => {
  logger.error({ err }, 'HTTP server error');
  void gracefulShutdown('SERVER_ERROR', 1);
});
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled rejection');
  void gracefulShutdown('UNHANDLED_REJECTION', 1);
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  void gracefulShutdown('UNCAUGHT_EXCEPTION', 1);
});
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
if (process.env.NODE_ENV !== 'test') void startServer();
export { server, io };
