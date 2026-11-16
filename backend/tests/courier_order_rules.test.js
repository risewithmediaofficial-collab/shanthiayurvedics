import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { Branch } from '../src/models/Branch.js';
import { User } from '../src/models/User.js';
import { Product } from '../src/models/Product.js';
import { ProductBatch } from '../src/models/ProductBatch.js';
import { Customer } from '../src/models/Customer.js';
import { ROLES } from '../src/constants/roles.js';
import './setup.js';

describe('Courier Service Order Placement Rules via API', () => {
  let managerToken;
  let branch;
  let customer;
  let product;
  let batch;

  beforeAll(async () => {
    branch = await Branch.findOne({ code: 'HSR' });
    if (!branch) {
      branch = await Branch.create({ code: 'HSR', name: 'Hosur Main', phone: '9842100000', address: { city: 'Hosur', state: 'Tamil Nadu', pincode: '635109' } });
    }

    const uniqueEmail = `mgr.couriertest.${Date.now()}@shanthiayurvedas.com`;
    const manager = await User.create({
      name: 'Manager Courier Rules',
      email: uniqueEmail,
      passwordHash: await User.hashPassword('Password@12345'),
      role: ROLES.MANAGER,
      branchId: branch._id,
      branches: [branch._id],
      isActive: true
    });

    const ml = await request(app).post('/api/auth/login').send({ email: uniqueEmail, password: 'Password@12345' });
    managerToken = ml.body.data.accessToken;

    customer = await Customer.create({
      name: 'Courier Rules Customer',
      mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      branchId: branch._id,
      assignedTelecallerId: manager._id,
      addresses: [{ street: '10 Gandhi St', city: 'Hosur', state: 'Tamil Nadu', pincode: '635109', isDefault: true }]
    });

    const sku = `TPC-BRM-${Date.now()}`;
    product = await Product.create({
      name: 'Brahmi Churna 100g',
      sku,
      category: 'CHURNAS',
      price: 250,
      mrp: 300,
      costPrice: 100
    });

    batch = await ProductBatch.create({
      productId: product._id,
      batchNumber: `BAT-${Date.now()}`,
      manufacturingDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      mrp: 300
    });

    await request(app)
      .post('/api/inventory/in')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        productId: product._id.toString(),
        batchId: batch._id.toString(),
        branchId: branch._id.toString(),
        quantity: 100
      });
  });

  it('should REJECT order if The Professional Courier is selected with COD', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        customerId: customer._id.toString(),
        branchId: branch._id.toString(),
        courierName: 'The Professional Courier',
        paymentMethod: 'COD',
        items: [{ productId: product._id.toString(), batchId: batch._id.toString(), quantity: 1, unitPrice: 250 }],
        deliveryAddress: customer.addresses[0]
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/The Professional Courier does not support Cash on Delivery/i);
  });

  it('should ACCEPT order if The Professional Courier is selected with ONLINE (Pre-payment)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        customerId: customer._id.toString(),
        branchId: branch._id.toString(),
        courierName: 'The Professional Courier',
        paymentMethod: 'ONLINE',
        items: [{ productId: product._id.toString(), batchId: batch._id.toString(), quantity: 1, unitPrice: 250 }],
        deliveryAddress: customer.addresses[0]
      });

    expect(res.status).toBe(201);
    expect(res.body.data.courierName).toBe('The Professional Courier');
    expect(res.body.data.paymentMethod).toBe('ONLINE');
    expect(res.body.data.codAmount).toBe(0);
  });

  it('should ACCEPT order if India Post is selected with COD', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        customerId: customer._id.toString(),
        branchId: branch._id.toString(),
        courierName: 'India Post',
        paymentMethod: 'COD',
        items: [{ productId: product._id.toString(), batchId: batch._id.toString(), quantity: 1, unitPrice: 250 }],
        deliveryAddress: customer.addresses[0]
      });

    expect(res.status).toBe(201);
    expect(res.body.data.courierName).toBe('India Post');
    expect(res.body.data.paymentMethod).toBe('COD');
    expect(res.body.data.codAmount).toBeGreaterThan(0);
  });

  it('should ACCEPT order if India Post is selected with ONLINE (Pre-payment)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        customerId: customer._id.toString(),
        branchId: branch._id.toString(),
        courierName: 'India Post',
        paymentMethod: 'ONLINE',
        items: [{ productId: product._id.toString(), batchId: batch._id.toString(), quantity: 1, unitPrice: 250 }],
        deliveryAddress: customer.addresses[0]
      });

    expect(res.status).toBe(201);
    expect(res.body.data.courierName).toBe('India Post');
    expect(res.body.data.paymentMethod).toBe('ONLINE');
    expect(res.body.data.codAmount).toBe(0);
  });

  it('should allow transitioning India Post order to DISPATCHED with scanned barcode without AWB generation error', async () => {
    // 1. Create India Post order
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        customerId: customer._id.toString(),
        branchId: branch._id.toString(),
        courierName: 'India Post',
        paymentMethod: 'COD',
        items: [{ productId: product._id.toString(), batchId: batch._id.toString(), quantity: 1, unitPrice: 250 }],
        deliveryAddress: customer.addresses[0]
      });

    expect(createRes.status).toBe(201);
    const orderId = createRes.body.data._id;

    // Transition to CONFIRMED
    await request(app)
      .patch(`/api/orders/${orderId}/transition`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'CONFIRMED' });

    // 2. Scan barcode and dispatch via PATCH /api/orders/:id (as done in ScanTrackerPage)
    const scanBarcode = `EK${Math.floor(100000000 + Math.random() * 900000000)}IN`;
    const patchRes = await request(app)
      .patch(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        trackingNumber: scanBarcode,
        courierName: 'India Post',
        status: 'DISPATCHED',
        shippingDate: new Date()
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.status).toBe('DISPATCHED');
    expect(patchRes.body.data.trackingNumber).toBe(scanBarcode);
    expect(patchRes.body.data.courierName).toBe('India Post');
  });
});
