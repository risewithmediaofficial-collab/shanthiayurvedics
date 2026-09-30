import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { Branch } from '../src/models/Branch.js';
import { User } from '../src/models/User.js';
import { Order } from '../src/models/Order.js';
import { WithdrawalRequest } from '../src/models/WithdrawalRequest.js';
import { ROLES } from '../src/constants/roles.js';
import './setup.js';

describe('Branch withdrawals', () => {
  let branch;
  let ownerToken;
  let managerToken;
  let telecallerToken;

  beforeAll(async () => {
    branch = await Branch.findOneAndUpdate({ code: 'HSR' }, { revenueSharePercent: 20 }, { new: true });
    const accounts = await Promise.all([
      User.create({ name: 'Withdrawal owner', email: 'withdraw.owner@example.com', passwordHash: await User.hashPassword('Password@12345'), role: ROLES.OWNER, branchId: branch._id, isActive: true }),
      User.create({ name: 'Withdrawal manager', email: 'withdraw.manager@example.com', passwordHash: await User.hashPassword('Password@12345'), role: ROLES.MANAGER, branchId: branch._id, isActive: true }),
      User.create({ name: 'Withdrawal caller', email: 'withdraw.caller@example.com', passwordHash: await User.hashPassword('Password@12345'), role: ROLES.TELECALLER, branchId: branch._id, isActive: true })
    ]);
    const tokens = await Promise.all(accounts.map(async (account) => {
      const login = await request(app).post('/api/auth/login').send({ email: account.email, password: 'Password@12345' });
      return login.body.data.accessToken;
    }));
    [ownerToken, managerToken, telecallerToken] = tokens;
    await Order.create({
      orderNumber: 'WITHDRAW-ORDER-001',
      customerId: new mongoose.Types.ObjectId(),
      branchId: branch._id,
      telecallerId: accounts[2]._id,
      items: [],
      subtotal: 50000,
      grandTotal: 50000,
      status: 'DELIVERED',
      deliveryAddress: { street: '1 Main Street', city: 'Hosur', state: 'Tamil Nadu', pincode: '635109' }
    });
  });

  it('calculates available balance from delivered orders and configured share', async () => {
    const res = await request(app).get('/api/reports/till-date-withdrawal').set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.metrics.commissionAccrued).toBe(10000);
    expect(res.body.data.metrics.availableBalance).toBe(10000);
    expect(res.body.data.ledger).toEqual([]);
  });

  it('persists a request, reserves its balance, and lets only the owner settle it', async () => {
    const payload = { amount: 5000, payoutMode: 'UPI', upiId: 'branch@bank' };
    const blocked = await request(app).post('/api/reports/withdrawal-request').set('Authorization', `Bearer ${telecallerToken}`).send(payload);
    expect(blocked.status).toBe(403);

    const created = await request(app).post('/api/reports/withdrawal-request').set('Authorization', `Bearer ${managerToken}`).send(payload);
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('PENDING');
    const id = created.body.data.id;
    expect(await WithdrawalRequest.countDocuments({ branchId: branch._id })).toBe(1);

    const second = await request(app).post('/api/reports/withdrawal-request').set('Authorization', `Bearer ${managerToken}`).send({ ...payload, amount: 6000 });
    expect(second.status).toBe(409);

    const report = await request(app).get('/api/reports/till-date-withdrawal').set('Authorization', `Bearer ${managerToken}`);
    expect(report.body.data.metrics.availableBalance).toBe(5000);
    expect(report.body.data.metrics.pendingWithdrawal).toBe(5000);
    expect(report.body.data.ledger[0].id).toBe(id);

    const managerSettlement = await request(app).patch(`/api/reports/withdrawal-request/${id}`).set('Authorization', `Bearer ${managerToken}`).send({ status: 'PROCESSED', referenceNo: 'BANK-123' });
    expect(managerSettlement.status).toBe(403);
    const settled = await request(app).patch(`/api/reports/withdrawal-request/${id}`).set('Authorization', `Bearer ${ownerToken}`).send({ status: 'PROCESSED', referenceNo: 'BANK-123' });
    expect(settled.status).toBe(200);
    const repeat = await request(app).patch(`/api/reports/withdrawal-request/${id}`).set('Authorization', `Bearer ${ownerToken}`).send({ status: 'PROCESSED', referenceNo: 'BANK-123' });
    expect(repeat.status).toBe(409);

    const pending = await request(app).post('/api/reports/withdrawal-request').set('Authorization', `Bearer ${managerToken}`).send(payload);
    expect(pending.status).toBe(201);
    const rejected = await request(app).patch(`/api/reports/withdrawal-request/${pending.body.data.id}`).set('Authorization', `Bearer ${ownerToken}`).send({ status: 'REJECTED' });
    expect(rejected.status).toBe(200);
    const afterRejection = await request(app).get('/api/reports/till-date-withdrawal').set('Authorization', `Bearer ${managerToken}`);
    expect(afterRejection.body.data.metrics.totalWithdrawn).toBe(5000);
    expect(afterRejection.body.data.metrics.pendingWithdrawal).toBe(0);
    expect(afterRejection.body.data.metrics.availableBalance).toBe(5000);
  });
});
