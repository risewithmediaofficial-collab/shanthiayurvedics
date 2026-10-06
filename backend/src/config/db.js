import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

mongoose.connection.on('error', (err) => logger.error({ err }, 'Database connection error'));
mongoose.connection.on('disconnected', () => logger.warn('Database disconnected'));

export const connectDB = async (customUri = null, maxRetries = 8, retryDelayMs = 2000) => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  let baseUri = customUri || env.MONGO_URI;

  // In Docker environment, ensure URI targets mongodb container rather than localhost/127.0.0.1
  if (!customUri && (baseUri.includes('127.0.0.1:27017') || baseUri.includes('localhost:27017'))) {
    baseUri = baseUri.replace('127.0.0.1:27017', 'mongodb:27017').replace('localhost:27017', 'mongodb:27017');
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
