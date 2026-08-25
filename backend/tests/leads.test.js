import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Branch } from '../src/models/Branch.js';
import { ROLES } from '../src/constants/roles.js';
import { CALL_STATUS } from '../src/constants/leadStates.js';
import './setup.js';

describe('Leads & Telecaller CRM Integration Tests', () => {
  let branch;
  let ownerToken;
  let telecaller1;
  let telecaller1Token;
  let telecaller2;
  let telecaller2Token;

  beforeAll(async () => {
    branch = await Branch.findOne({ code: 'HSR' });

    // 1. Owner
    const owner = await User.create({
      name: 'Owner Leads Test',
      email: 'owner.leads@shanthiayurvedas.com',
      passwordHash: await User.hashPassword('Password@12345'),
      role: ROLES.OWNER,
      branchId: branch._id,
      branches: [branch._id],
      isActive: true
    });
    const ownerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: owner.email, password: 'Password@12345' });
    ownerToken = ownerLogin.body.data.accessToken;

    // 2. Telecaller 1
    telecaller1 = await User.create({
      name: 'Telecaller Priya',
      email: 'priya.crm@shanthiayurvedas.com',
      passwordHash: await User.hashPassword('Password@12345'),
      role: ROLES.TELECALLER,
      branchId: branch._id,
      branches: [branch._id],
      isActive: true
    });
    const tc1Login = await request(app)
      .post('/api/auth/login')
      .send({ email: telecaller1.email, password: 'Password@12345' });
    telecaller1Token = tc1Login.body.data.accessToken;

    // 3. Telecaller 2
    telecaller2 = await User.create({
      name: 'Telecaller Karthik',
      email: 'karthik.crm@shanthiayurvedas.com',
      passwordHash: await User.hashPassword('Password@12345'),
      role: ROLES.TELECALLER,
      branchId: branch._id,
      branches: [branch._id],
      isActive: true
    });
    const tc2Login = await request(app)
      .post('/api/auth/login')
      .send({ email: telecaller2.email, password: 'Password@12345' });
    telecaller2Token = tc2Login.body.data.accessToken;
  });

  let createdLeadId;

  it('should create a new lead and assign to telecaller', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Venkatesh Kumar',
        mobile: '9840123456',
        email: 'venkatesh@gmail.com',
        source: 'META',
        branchId: branch._id.toString(),
        assignedTo: telecaller1._id.toString(),
        city: 'Hosur',
        state: 'Tamil Nadu'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Venkatesh Kumar');
    expect(res.body.data.assignedTo._id.toString()).toBe(telecaller1._id.toString());
    createdLeadId = res.body.data._id;
  });

  it('should detect duplicate lead when attempting to create with same mobile number', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Venkatesh Duplicate',
        mobile: '9840123456',
        source: 'WEBSITE',
        branchId: branch._id.toString()
      });

    expect(res.status).toBe(200);
    expect(res.body.isDuplicateWarning).toBe(true);
    expect(res.body.data.existingLead).toBeDefined();
    expect(res.body.data.existingLead.mobile).toBe('9840123456');
  });

  it('should enforce telecaller ownership: Telecaller 1 can see assigned lead, Telecaller 2 cannot', async () => {
    // Telecaller 1 query
    const tc1Res = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${telecaller1Token}`);

    expect(tc1Res.status).toBe(200);
    const hasLead = tc1Res.body.data.some((l) => l._id === createdLeadId);
    expect(hasLead).toBe(true);

    // Telecaller 2 query
    const tc2Res = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${telecaller2Token}`);

    expect(tc2Res.status).toBe(200);
    const tc2HasLead = tc2Res.body.data.some((l) => l._id === createdLeadId);
    expect(tc2HasLead).toBe(false);
  });

  it('should log a call non-destructively and update lead status', async () => {
    const callRes = await request(app)
      .post(`/api/leads/${createdLeadId}/calls`)
      .set('Authorization', `Bearer ${telecaller1Token}`)
      .send({
        callStatus: CALL_STATUS.INTERESTED,
        notes: 'Customer inquired about Ayurvedic Joint Pain Oil pack',
        callDurationSeconds: 120,
        nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: 'HIGH'
      });

    expect(callRes.status).toBe(201);
    expect(callRes.body.data.callStatus).toBe(CALL_STATUS.INTERESTED);

    // Fetch lead details and verify timeline
    const leadRes = await request(app)
      .get(`/api/leads/${createdLeadId}`)
      .set('Authorization', `Bearer ${telecaller1Token}`);

    expect(leadRes.status).toBe(200);
    expect(leadRes.body.data.calls.length).toBeGreaterThan(0);
    expect(leadRes.body.data.lead.status).toBe('INTERESTED');
  });

  it('should convert lead to customer with address', async () => {
    const convertRes = await request(app)
      .post(`/api/customers/convert-lead/${createdLeadId}`)
      .set('Authorization', `Bearer ${telecaller1Token}`)
      .send({
        name: 'Venkatesh Kumar',
        street: '42, Lake View Road',
        city: 'Hosur',
        state: 'Tamil Nadu',
        pincode: '635109'
      });

    expect(convertRes.status).toBe(201);
    expect(convertRes.body.data.name).toBe('Venkatesh Kumar');
    expect(convertRes.body.data.addresses.length).toBeGreaterThan(0);
  });
});
