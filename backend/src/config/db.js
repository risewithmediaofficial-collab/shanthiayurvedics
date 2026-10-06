import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

mongoose.connection.on('error', (err) => logger.error({ err }, 'Database connection error'));
mongoose.connection.on('disconnected', () => logger.warn('Database disconnected'));

export const connectDB = async (customUri = null, maxRetries = 5, retryDelayMs = 2000) => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const connection = await mongoose.connect(customUri || env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: env.DB_MAX_POOL_SIZE,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        waitQueueTimeoutMS: 10000,
        autoIndex: env.NODE_ENV !== 'production'
      });
      logger.info('Database connected');
      return connection;
    } catch (err) {
      logger.warn({ attempt }, 'Database connection failed');
      if (attempt === maxRetries) throw err;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};
export const disconnectDB = async () => { await mongoose.disconnect(); };
