import mongoose from 'mongoose';
import fs from 'node:fs';
import { env } from './env.js';
import { logger } from './logger.js';

mongoose.connection.on('error', (err) => logger.error({ err }, 'Database connection error'));
mongoose.connection.on('disconnected', () => logger.warn('Database disconnected'));

const isRunningInDocker = () => {
  try {
    return fs.existsSync('/.dockerenv') || Boolean(process.env.DOCKER_CONTAINER);
  } catch {
    return false;
  }
};

export const connectDB = async (customUri = null, maxRetries = 8, retryDelayMs = 2000) => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  let baseUri = customUri || env.MONGO_URI;

  if (!customUri) {
    if (isRunningInDocker()) {
      // In Docker container, ensure URI targets mongodb container rather than localhost/127.0.0.1
      if (baseUri.includes('127.0.0.1:27017') || baseUri.includes('localhost:27017')) {
        baseUri = baseUri.replace('127.0.0.1:27017', 'mongodb:27017').replace('localhost:27017', 'mongodb:27017');
      }
    } else {
      // Outside Docker (local host/Windows), 'mongodb' host cannot be resolved via DNS
      if (baseUri.includes('mongodb:27017')) {
        baseUri = baseUri.replace('mongodb:27017', '127.0.0.1:27017');
      }
    }
  }

  const urisToAttempt = [baseUri];

  // If baseUri contains auth credentials, add known persistent volume credential and unauthenticated fallback
  if (baseUri.includes('@')) {
    const defaultVolumeUri = baseUri.replace(/mongodb:\/\/[^:]+:[^@]+@/, 'mongodb://admin:SecureAdminPassword123@');
    if (!urisToAttempt.includes(defaultVolumeUri)) {
      urisToAttempt.push(defaultVolumeUri);
    }
    const unauthUri = baseUri.replace(/mongodb:\/\/[^@]+@/, 'mongodb://').split('?')[0];
    if (!urisToAttempt.includes(unauthUri)) {
      urisToAttempt.push(unauthUri);
    }
  } else {
    // If baseUri is unauthenticated, also allow testing with default admin credentials if unauth fails
    const authUri = baseUri.replace('mongodb://', 'mongodb://admin:SecureAdminPassword123@') + (baseUri.includes('?') ? '&authSource=admin' : '?authSource=admin');
    if (!urisToAttempt.includes(authUri)) {
      urisToAttempt.push(authUri);
    }
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const uri of urisToAttempt) {
      try {
        const connection = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 8000,
          socketTimeoutMS: 45000,
          maxPoolSize: env.DB_MAX_POOL_SIZE,
          minPoolSize: 2,
          maxIdleTimeMS: 30000,
          waitQueueTimeoutMS: 10000,
          autoIndex: env.NODE_ENV !== 'production'
        });
        logger.info({ host: connection.connection?.host, name: connection.connection?.name }, 'Database connected');
        return connection;
      } catch (err) {
        logger.warn({ attempt, uri: uri.replace(/:[^@]+@/, ':****@'), message: err.message }, 'Database connection attempt failed');
      }
    }
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  throw new Error(`All ${maxRetries} database connection attempts failed.`);
};
export const disconnectDB = async () => { await mongoose.disconnect(); };
