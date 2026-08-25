import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { RbacService } from '../src/services/rbacService.js';
import { Branch } from '../src/models/Branch.js';

let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test_jwt_access_secret_key_1234567890';
  process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_key_1234567890';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Initialize roles and permissions in test memory db
  await RbacService.initializeDefaultRoles();

  // Create default branch
  await Branch.create({
    name: 'Hosur Main Branch',
    code: 'HSR',
    phone: '+91 98421 11223',
    email: 'hosur@shanthiayurvedas.com',
    isActive: true
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  // Clear non-system collections before each test if needed
});
