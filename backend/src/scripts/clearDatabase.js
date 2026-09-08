import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';

const clearDatabase = async () => {
  if (!process.argv.includes('--confirm')) {
    throw new Error('Database clear cancelled. Re-run with --confirm to remove all records.');
  }

  await connectDB();
  await mongoose.connection.dropDatabase();
  logger.info('Database cleared. No seed data was created.');
};

try {
  await clearDatabase();
} catch (error) {
  logger.error(`Database clear failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
