import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

let isConnected = false;

export const connectDB = async (customUri = null, maxRetries = 5, retryDelayMs = 2000) => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const primaryUri = customUri || env.MONGO_URI;
  // Fallback URI without auth credentials if auth fails on existing volumes
  const fallbackUri = primaryUri.includes('@')
    ? primaryUri.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://').split('?')[0]
    : null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Connecting to MongoDB (attempt ${attempt}/${maxRetries})...`);
      const conn = await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000
      });

      isConnected = true;
      logger.info(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

      mongoose.connection.on('error', (err) => {
        logger.error(`MongoDB connection error: ${err.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting reconnection...');
        isConnected = false;
      });

      return conn;
    } catch (error) {
      logger.warn(`⚠️ MongoDB connection attempt ${attempt} failed: ${error.message}`);

      // If authentication failed and fallback URI exists, try fallback
      if (fallbackUri && /auth|authentication/i.test(error.message)) {
        try {
          logger.info(`Retrying MongoDB without credentials fallback: ${fallbackUri}...`);
          const conn = await mongoose.connect(fallbackUri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000
          });
          isConnected = true;
          logger.info(`✅ MongoDB Connected via unauthenticated fallback: ${conn.connection.host}/${conn.connection.name}`);
          return conn;
        } catch (fallbackErr) {
          logger.warn(`Unauthenticated fallback also failed: ${fallbackErr.message}`);
        }
      }

      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, retryDelayMs));
      } else {
        logger.error(`❌ All ${maxRetries} MongoDB connection attempts failed.`);
        throw error;
      }
    }
  }
};

export const disconnectDB = async () => {
  if (!isConnected) return;
  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('MongoDB connection closed.');
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
  }
};
