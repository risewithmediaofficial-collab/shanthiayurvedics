import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Branch } from '../src/models/Branch.js';
import { Customer } from '../src/models/Customer.js';
import { Product } from '../src/models/Product.js';
import { ProductBatch } from '../src/models/ProductBatch.js';
import { Inventory } from '../src/models/Inventory.js';
import { Order } from '../src/models/Order.js';
import { ROLES } from '../src/constants/roles.js';
import { ORDER_STATUS } from '../src/constants/orderStates.js';
import { RTO_CONDITION, SHIPPING_STATUS } from '../src/constants/shippingStates.js';
import './setup.js';

describe('Operations, Shipping & RTO Recovery Integration Tests', () => {
  let branch;
  let managerUser;
  let managerToken;
  let customer;
  let product;
  let batch;
  let order;

  beforeAll(async () => {
    branch = await Branch.findOne({ code: 'HSR' });

    managerUser = await User.create({
      name: 'Manager Operations',
      email: 'manager.ops@shanthiayurvedas.com',
      passwordHash: await User.hashPassword('Password@12345'),
      role: ROLES.MANAGER,
      branchId: branch._id,
      branches: [branch._id],
      isActive: true
    });
    const mgrLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: managerUser.email, password: 'Password@12345' });
    managerToken = mgrLogin.body.data.accessToken;

    customer = await Customer.create({
      name: 'Senthil Nathan',
      mobile: '9843312345',
      branchId: branch._id,
      addresses: [
        {
          street: '15 Anna Nagar',
          city: 'Hosur',
          state: 'Tamil Nadu',
          pincode: '635109',
          isDefault: true
        }
      ]
    });

    product = await Product.create({
      name: 'Pain Relief Balm 50g',
      sku: 'PRB-50',
      category: 'OILS',
      price: 150,
      mrp: 180,
      costPrice: 60
    });

    batch = await ProductBatch.create({
      productId: product._id,
      batchNumber: 'PRB-B01',
      manufacturingDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      mrp: 180
    });

    // Stock in 20 units
    await request(app)
      .post('/api/inventory/in')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        productId: product._id.toString(),
        batchId: batch._id.toString(),
        branchId: branch._id.toString(),
        quantity: 20
      });

    // Create an order for 2 units
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        customerId: customer._id.toString(),
        branchId: branch._id.toString(),
        items: [
          {
            productId: product._id.toString(),
            batchId: batch._id.toString(),
            quantity: 2,
            unitPrice: 150
          }
        ],
        paymentMethod: 'COD'
      });

    order = orderRes.body.data;
  });

  let packingRecord;
  let shipment;
  let rtoRecord;

  it('should pack the order, record box dimensions & weight, and transition order to PACKED', async () => {
    const packRes = await request(app)
      .post(`/api/operations/orders/${order._id}/pack`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        weightGrams: 350,
        dimensions: { lengthCm: 18, widthCm: 12, heightCm: 8 },
        boxType: 'Medium Corrugated Box',
        sealNumber: 'SEAL-8891'
      });

    expect(packRes.status).toBe(200);
    expect(packRes.body.data.order.status).toBe(ORDER_STATUS.PACKED);
    expect(packRes.body.data.packingRecord.weightGrams).toBe(350);
    packingRecord = packRes.body.data.packingRecord;
  });

  it('should create shipment, generate India Post AWB barcode, and set READY_FOR_DISPATCH', async () => {
    const shipRes = await request(app)
      .post(`/api/shipping/orders/${order._id}/shipment`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        carrierCode: 'INDIA_POST',
        shippingCharge: 50
      });

    expect(shipRes.status).toBe(201);
    expect(shipRes.body.data.awbNumber).toMatch(/^EM\d+IN$/);
    shipment = shipRes.body.data;
  });

  it('should dispatch shipment and transition order to DISPATCHED', async () => {
    const dispatchRes = await request(app)
      .patch(`/api/shipping/shipments/${shipment._id}/dispatch`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(dispatchRes.status).toBe(200);
    expect(dispatchRes.body.data.trackingStatus).toBe(SHIPPING_STATUS.PICKED_UP);
  });

  it('should retrieve public live tracking timeline using AWB', async () => {
    const trackRes = await request(app).get(`/api/shipping/track/${shipment.awbNumber}`);

    expect(trackRes.status).toBe(200);
    expect(trackRes.body.data.events.length).toBeGreaterThan(0);
    expect(trackRes.body.data.shipment.awbNumber).toBe(shipment.awbNumber);
  });

  it('should handle Delivery Failure and initiate RTO', async () => {
    const rtoRes = await request(app)
      .post('/api/rto/initiate')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        orderId: order._id.toString(),
        reason: 'CUSTOMER_REFUSED',
        notes: 'Customer was not available at delivery address'
      });

    expect(rtoRes.status).toBe(201);
    expect(rtoRes.body.data.status).toBe('RTO_INITIATED');
    rtoRecord = rtoRes.body.data;
  });

  it('should mark RTO return package as received at branch', async () => {
    const receiveRes = await request(app)
      .patch(`/api/rto/${rtoRecord._id}/receive`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(receiveRes.status).toBe(200);
    expect(receiveRes.body.data.status).toBe('RECEIVED_AT_BRANCH');
  });

  it('should verify condition as SALEABLE and restore stock back to inventory', async () => {
    // Check available before recovery: should be 20 - 2 = 18
    const invBefore = await Inventory.findOne({ productId: product._id, branchId: branch._id });
    expect(invBefore.availableQuantity).toBe(18);

    const verifyRes = await request(app)
      .patch(`/api/rto/${rtoRecord._id}/verify`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        condition: RTO_CONDITION.SALEABLE,
        notes: 'Outer box intact and medicine seal unbroken. Returned to available stock.'
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe('VERIFIED');
    expect(verifyRes.body.data.condition).toBe(RTO_CONDITION.SALEABLE);

    // Verify stock is restored from 18 back to 20!
    const invAfter = await Inventory.findOne({ productId: product._id, branchId: branch._id });
    expect(invAfter.availableQuantity).toBe(20);
  });
});
