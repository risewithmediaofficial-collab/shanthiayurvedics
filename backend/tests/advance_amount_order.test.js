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

describe('Advance Payment & UTR Order Tests', () => {
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

    const uniqueEmail = `mgr.advancetest.${Date.now()}@shanthiayurvedas.com`;
    const manager = await User.create({
      name: 'Manager Advance Rules',
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
      name: 'Advance Rules Customer',
      mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      branchId: branch._id,
      assignedTelecallerId: manager._id,
      addresses: [{ street: '10 Gandhi St', city: 'Hosur', state: 'Tamil Nadu', pincode: '635109', isDefault: true }]
    });

    const sku = `ADV-PRD-${Date.now()}`;
    product = await Product.create({
      name: 'Ashwagandha Legyam 500g',
      sku,
      category: 'LEHYAMS',
      price: 900,
      mrp: 1000,
      costPrice: 400
    });

    batch = await ProductBatch.create({
      productId: product._id,
      batchNumber: `BAT-ADV-${Date.now()}`,
      manufacturingDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      mrp: 1000
    });

    await request(app)
      .post('/api/inventory/in')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        productId: product._id.toString(),
        batchId: batch._id.toString(),
        quantity: 50,
        unitCost: 400,
        notes: 'Initial Stock for Advance Amount Tests'
      });
  });

  it('should subtract advanceAmount from total and set codAmount correctly, and store advanceUtr', async () => {
    // 2 units of 900 = 1800. Shipping = 0. Total = 1800.
    // Advance = 300, UTR = 'UPI4291823901'.
    // Expected COD Collect = 1800 - 300 = 1500.
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        customerId: customer._id.toString(),
        patientName: 'Kavitha S',
        mobile: '9842199887',
        courierName: 'India Post',
        paymentMethod: 'COD',
        shippingCharge: 0,
        advanceAmount: 300,
        advanceUtr: 'UPI4291823901',
        items: [
          {
            productId: product._id.toString(),
            batchId: batch._id.toString(),
            quantity: 2,
            unitPrice: 900,
            discount: 0
          }
        ],
        deliveryAddress: {
          street: '15 Anna Nagar',
          city: 'Hosur',
          state: 'Tamil Nadu',
          pincode: '635109'
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.data.grandTotal).toBe(1800);
    expect(res.body.data.advanceAmount).toBe(300);
    expect(res.body.data.advanceUtr).toBe('UPI4291823901');
    expect(res.body.data.codAmount).toBe(1500);

    // Update order with new advance and UTR
    const orderId = res.body.data._id;
    const updateRes = await request(app)
      .patch(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        advanceAmount: 500,
        advanceUtr: 'UPI4291823902'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.advanceAmount).toBe(500);
    expect(updateRes.body.data.advanceUtr).toBe('UPI4291823902');
    expect(updateRes.body.data.codAmount).toBe(1300);
  });
});
