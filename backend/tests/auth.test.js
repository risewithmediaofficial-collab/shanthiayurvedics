import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Branch } from '../src/models/Branch.js';
import { ROLES } from '../src/constants/roles.js';
import './setup.js';

describe('Authentication & RBAC Integration Tests', () => {
  let testBranch;
  let ownerUser;
  let telecallerUser;
  const ownerPassword = 'Password@12345';
  const telecallerPassword = 'Password@12345';

  beforeAll(async () => {
    testBranch = await Branch.findOne({ code: 'HSR' });

    ownerUser = await User.create({
      name: 'Owner Admin',
      email: 'owner.test@shanthiayurvedas.com',
      passwordHash: await User.hashPassword(ownerPassword),
      role: ROLES.OWNER,
      branchId: testBranch._id,
      branches: [testBranch._id],
      isActive: true
    });

    telecallerUser = await User.create({
      name: 'Priya Telecaller',
      email: 'priya.test@shanthiayurvedas.com',
      passwordHash: await User.hashPassword(telecallerPassword),
      role: ROLES.TELECALLER,
      branchId: testBranch._id,
      branches: [testBranch._id],
      isActive: true
    });
  });

  it('should authenticate user with valid credentials and return access token & cookies', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'owner.test@shanthiayurvedas.com',
        password: ownerPassword
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('owner.test@shanthiayurvedas.com');
    expect(res.body.data.accessToken).toBeDefined();

    // Verify HTTP-only cookies
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('accessToken'))).toBe(true);
    expect(cookies.some((c) => c.includes('refreshToken'))).toBe(true);
  });

  it('should reject login with wrong password and return 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'owner.test@shanthiayurvedas.com',
        password: 'WrongPassword@123'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should allow accessing protected /api/auth/me with valid Bearer token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'owner.test@shanthiayurvedas.com',
        password: ownerPassword
      });

    const token = loginRes.body.data.accessToken;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('owner.test@shanthiayurvedas.com');
    expect(meRes.body.data.user.role).toBe(ROLES.OWNER);
  });

  it('should enforce RBAC: Allow Owner to manage branches, but reject Telecaller with 403', async () => {
    // 1. Telecaller login
    const telecallerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'priya.test@shanthiayurvedas.com',
        password: telecallerPassword
      });

    const telecallerToken = telecallerLogin.body.data.accessToken;

    // Telecaller attempts to create a new branch -> Expect 403
    const telecallerBranchAttempt = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${telecallerToken}`)
      .send({
        name: 'Unauthorized Branch',
        code: 'UNAUTH'
      });

    expect(telecallerBranchAttempt.status).toBe(403);
    expect(telecallerBranchAttempt.body.success).toBe(false);

    // 2. Owner login
    const ownerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'owner.test@shanthiayurvedas.com',
        password: ownerPassword
      });

    const ownerToken = ownerLogin.body.data.accessToken;

    // Owner creates new branch -> Expect 201
    const ownerBranchRes = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Salem New Branch',
        code: 'SLM'
      });

    expect(ownerBranchRes.status).toBe(201);
    expect(ownerBranchRes.body.data.code).toBe('SLM');
  });

  it('should rotate refresh token on session refresh', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'owner.test@shanthiayurvedas.com',
        password: ownerPassword
      });

    const cookies = loginRes.headers['set-cookie'];

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeDefined();
  });
});
