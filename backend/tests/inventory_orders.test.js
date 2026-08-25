import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Branch } from '../src/models/Branch.js';
import { Customer } from '../src/models/Customer.js';
import { ROLES } from '../src/constants/roles.js';
import { ORDER_STATUS } from '../src/constants/orderStates.js';
import './setup.js';

describe('Inventory & Orders Integration Tests (ACID & State Machine)', () => {
  let branch;
  let managerUser;
  let managerToken;
  let telecallerUser;
  let telecallerToken;
  let customer;
  let testProduct;
  let testBatch;

  beforeAll(async () => {
    branch = await Branch.findOne({ code: 'HSR' });

    managerUser = await User.create({
      name: 'Manager Anand',
      email: 'manager.inv@shanthiayurvedas.com',
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

    telecallerUser = await User.create({
      name: 'Telecaller Priya Inv',
      email: 'priya.inv@shanthiayurvedas.com',
      passwordHash: await User.hashPassword('Password@12345'),
      role: ROLES.TELECALLER,
      branchId: branch._id,
      branches: [branch._id],
      isActive: true
    });
    const tcLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: telecallerUser.email, password: 'Password@12345' });
    telecallerToken = tcLogin.body.data.accessToken;

    customer = await Customer.create({
      name: 'Ravi Teja',
      mobile: '9841234567',
      branchId: branch._id,
      assignedTelecallerId: telecallerUser._id,
      addresses: [
        {
          street: '12 Temple Road',
          city: 'Hosur',
          state: 'Tamil Nadu',
          pincode: '635109',
          isDefault: true
        }
      ]
    });
  });

  it('should create a product and initial batch', async () => {
    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Maha Bhringraj Taila 200ml',
        sku: 'MBT-200',
        category: 'OILS',
        description: 'Herbal hair and scalp revitalizer',
        price: 499,
        mrp: 599,
        costPrice: 200,
        initialBatch: {
          batchNumber: 'MBT-B01',
          manufacturingDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

    expect(prodRes.status).toBe(201);
    expect(prodRes.body.data.sku).toBe('MBT-200');
    testProduct = prodRes.body.data;

    // Fetch batches
    const detailsRes = await request(app)
      .get(`/api/products/${testProduct._id}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(detailsRes.status).toBe(200);
    expect(detailsRes.body.data.batches.length).toBe(1);
    testBatch = detailsRes.body.data.batches[0];
  });

  it('should record Stock In and create a stock movement ledger entry', async () => {
    const stockInRes = await request(app)
      .post('/api/inventory/in')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        productId: testProduct._id,
        batchId: testBatch._id,
        branchId: branch._id.toString(),
        quantity: 50,
        reason: 'PURCHASE',
        notes: 'Initial warehouse batch delivery'
      });

    expect(stockInRes.status).toBe(200);
    expect(stockInRes.body.data.inventory.availableQuantity).toBe(50);
    expect(stockInRes.body.data.movement.type).toBe('IN');

    // Verify in movements ledger
    const movementsRes = await request(app)
      .get(`/api/inventory/movements?productId=${testProduct._id}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(movementsRes.status).toBe(200);
    expect(movementsRes.body.data.length).toBeGreaterThan(0);
    expect(movementsRes.body.data[0].type).toBe('IN');
  });

  let createdOrderId;

  it('should create an order and atomically reserve stock in inventory', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${telecallerToken}`)
      .send({
        customerId: customer._id.toString(),
        branchId: branch._id.toString(),
        items: [
          {
            productId: testProduct._id,
            batchId: testBatch._id,
            quantity: 5,
            unitPrice: 499
          }
        ],
        paymentMethod: 'COD',
        deliveryAddress: customer.addresses[0]
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.orderNumber).toBeDefined();
    expect(orderRes.body.data.grandTotal).toBe(2495);
    createdOrderId = orderRes.body.data._id;

    // Verify inventory: available should be 50 - 5 = 45, reserved should be 5
    const invRes = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${managerToken}`);

    const itemInv = invRes.body.data.find(
      (i) => i.productId._id === testProduct._id && i.batchId._id === testBatch._id
    );
    expect(itemInv.availableQuantity).toBe(45);
    expect(itemInv.reservedQuantity).toBe(5);
  });

  it('should prevent overselling: reject order if requested quantity exceeds available stock', async () => {
    const excessiveOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${telecallerToken}`)
      .send({
        customerId: customer._id.toString(),
        branchId: branch._id.toString(),
        items: [
          {
            productId: testProduct._id,
            batchId: testBatch._id,
            quantity: 100, // available is only 45
            unitPrice: 499
          }
        ],
        paymentMethod: 'COD'
      });

    expect(excessiveOrderRes.status).toBe(400);
    expect(excessiveOrderRes.body.success).toBe(false);
    expect(excessiveOrderRes.body.message).toContain('Insufficient available stock');
  });

  it('should enforce strict state machine: reject illegal transition (NEW -> DELIVERED)', async () => {
    const illegalJumpRes = await request(app)
      .patch(`/api/orders/${createdOrderId}/transition`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        status: ORDER_STATUS.DELIVERED
      });

    expect(illegalJumpRes.status).toBe(400);
    expect(illegalJumpRes.body.success).toBe(false);
    expect(illegalJumpRes.body.message).toContain('Invalid order status transition');
  });

  it('should allow valid transitions (NEW -> CONFIRMED -> PROCESSING)', async () => {
    const confirmRes = await request(app)
      .patch(`/api/orders/${createdOrderId}/transition`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        status: ORDER_STATUS.CONFIRMED,
        notes: 'Order confirmed with customer over phone'
      });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe(ORDER_STATUS.CONFIRMED);

    const processRes = await request(app)
      .patch(`/api/orders/${createdOrderId}/transition`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        status: ORDER_STATUS.PROCESSING,
        notes: 'Order sent to packing bay'
      });

    expect(processRes.status).toBe(200);
    expect(processRes.body.data.status).toBe(ORDER_STATUS.PROCESSING);
  });

  it('should release reserved stock back to available inventory on order cancellation', async () => {
    const cancelRes = await request(app)
      .patch(`/api/orders/${createdOrderId}/transition`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        status: ORDER_STATUS.CANCELLED,
        cancellationReason: 'Customer requested cancellation before packing'
      });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe(ORDER_STATUS.CANCELLED);

    // Verify stock is restored: available goes back from 45 to 50, reserved goes from 5 to 0
    const invRes = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${managerToken}`);

    const itemInv = invRes.body.data.find(
      (i) => i.productId._id === testProduct._id && i.batchId._id === testBatch._id
    );
    expect(itemInv.availableQuantity).toBe(50);
    expect(itemInv.reservedQuantity).toBe(0);
  });
});
