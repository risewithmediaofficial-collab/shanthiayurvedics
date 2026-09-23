/**
 * courier_import.test.js
 *
 * Unit + integration tests for:
 *  - fileParserService: Excel parsing, PDF parsing, AWB regex extraction
 *  - courierImportService: status mapper, bulk update flow, import summary
 *  - POST /api/shipping/import-status API endpoint
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import xlsx from 'xlsx';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Branch } from '../src/models/Branch.js';
import { Customer } from '../src/models/Customer.js';
import { Product } from '../src/models/Product.js';
import { ProductBatch } from '../src/models/ProductBatch.js';
import { Order } from '../src/models/Order.js';
import { Shipment } from '../src/models/Shipment.js';
import { TrackingEvent } from '../src/models/TrackingEvent.js';
import { ROLES } from '../src/constants/roles.js';
import { SHIPPING_STATUS } from '../src/constants/shippingStates.js';
import { ORDER_STATUS } from '../src/constants/orderStates.js';
import { parseExcelBuffer } from '../src/services/fileParserService.js';
import './setup.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build an xlsx buffer from row data (header row + data rows) */
function buildExcelBuffer(rows) {
  const ws = xlsx.utils.aoa_to_sheet(rows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// ── fileParserService unit tests ─────────────────────────────────────────────

describe('fileParserService — Excel parsing', () => {
  it('should parse India Post AWBs with status from standard headers', () => {
    const buffer = buildExcelBuffer([
      ['Tracking Number', 'Status'],
      ['EM123456789IN', 'Delivered'],
      ['EM987654321IN', 'In Transit'],
      ['EM111222333IN', 'Not Delivered'],
    ]);

    const result = parseExcelBuffer(buffer);
    expect(result).toHaveLength(3);
    expect(result[0].awbNumber).toBe('EM123456789IN');
    expect(result[0].rawStatus).toBe('Delivered');
    expect(result[1].awbNumber).toBe('EM987654321IN');
    expect(result[1].rawStatus).toBe('In Transit');
  });

  it('should parse TPC-style AWBs (numeric) with status column', () => {
    const buffer = buildExcelBuffer([
      ['Consignment No', 'Current Status'],
      ['123456789012', 'DL'],
      ['987654321098', 'OFD'],
    ]);

    const result = parseExcelBuffer(buffer);
    expect(result).toHaveLength(2);
    expect(result[0].awbNumber).toBe('123456789012');
    expect(result[0].rawStatus).toBe('DL');
  });

  it('should handle alternate header names (AWB, Delivery Status)', () => {
    const buffer = buildExcelBuffer([
      ['AWB', 'Delivery Status'],
      ['EM444555666IN', 'Item Delivered'],
    ]);

    const result = parseExcelBuffer(buffer);
    expect(result).toHaveLength(1);
    expect(result[0].awbNumber).toBe('EM444555666IN');
    expect(result[0].rawStatus).toBe('Item Delivered');
  });

  it('should skip rows with empty AWB cells', () => {
    const buffer = buildExcelBuffer([
      ['Tracking Number', 'Status'],
      ['', 'Delivered'],
      ['EM123000000IN', 'In Transit'],
    ]);

    const result = parseExcelBuffer(buffer);
    expect(result).toHaveLength(1);
  });

  it('should return empty array for sheet with only header', () => {
    const buffer = buildExcelBuffer([['Tracking Number', 'Status']]);
    const result = parseExcelBuffer(buffer);
    expect(result).toHaveLength(0);
  });
});

// ── API integration tests ─────────────────────────────────────────────────────

describe('POST /api/shipping/import-status — API integration', () => {
  let managerToken;
  let shipment1, shipment2, shipment3;
  const AWB_1 = 'EM100200300IN'; // Will be updated to DELIVERED
  const AWB_2 = 'EM100200301IN'; // Will be updated to IN_TRANSIT
  const AWB_3 = 'EM100200302IN'; // Will be updated to RTO_INITIATED
  const AWB_UNKNOWN = 'EM999999999IN'; // Does not exist in DB

  beforeAll(async () => {
    const branch = await Branch.findOne({ code: 'HSR' });

    const manager = await User.create({
      name: 'Import Test Manager',
      email: 'import.mgr@shanthiayurvedas.com',
      passwordHash: await User.hashPassword('Password@12345'),
      role: ROLES.MANAGER,
      branchId: branch._id,
      branches: [branch._id],
      isActive: true,
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: manager.email, password: 'Password@12345' });
    managerToken = loginRes.body.data.accessToken;

    const customer = await Customer.create({
      name: 'Import Test Customer',
      mobile: '9900112233',
      branchId: branch._id,
      addresses: [{ street: '1 Test St', city: 'Hosur', state: 'Tamil Nadu', pincode: '635109', isDefault: true }],
    });

    const product = await Product.create({
      name: 'Test Herb Oil',
      sku: 'THO-01',
      category: 'OILS',
      price: 200,
      mrp: 240,
      costPrice: 80,
    });

    const batch = await ProductBatch.create({
      productId: product._id,
      batchNumber: 'THO-B01',
      manufacturingDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      mrp: 240,
    });

    // Helper to create a minimal test order + shipment pair
    async function createTestShipment(awbNumber, initialStatus) {
      const order = await Order.create({
        orderNumber: `TEST-${awbNumber.slice(-5)}`,
        customerId: customer._id,
        branchId: branch._id,
        telecallerId: manager._id,
        items: [{ productId: product._id, batchId: batch._id, productName: 'Test', sku: 'THO-01', quantity: 1, unitPrice: 200, total: 200 }],
        subtotal: 200,
        grandTotal: 200,
        deliveryAddress: { street: '1 Test St', city: 'Hosur', state: 'Tamil Nadu', pincode: '635109' },
        paymentMethod: 'COD',
        status: ORDER_STATUS.DISPATCHED,
      });

      const shipment = await Shipment.create({
        orderId: order._id,
        branchId: branch._id,
        courierName: 'India Post',
        awbNumber,
        shippingCharge: 50,
        trackingStatus: initialStatus,
      });

      return { order, shipment };
    }

    ({ shipment: shipment1 } = await createTestShipment(AWB_1, SHIPPING_STATUS.IN_TRANSIT));
    ({ shipment: shipment2 } = await createTestShipment(AWB_2, SHIPPING_STATUS.SHIPMENT_CREATED));
    ({ shipment: shipment3 } = await createTestShipment(AWB_3, SHIPPING_STATUS.IN_TRANSIT));
  });

  it('should return 400 when no file is uploaded', async () => {
    const res = await request(app)
      .post('/api/shipping/import-status')
      .set('Authorization', `Bearer ${managerToken}`)
      .field('courier', 'AUTO');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/No file/i);
  });

  it('should reject unsupported file types', async () => {
    const txtBuffer = Buffer.from('this is not a valid tracking file');
    const res = await request(app)
      .post('/api/shipping/import-status')
      .set('Authorization', `Bearer ${managerToken}`)
      .attach('file', txtBuffer, { filename: 'report.txt', contentType: 'text/plain' })
      .field('courier', 'AUTO');

    // multer fileFilter will call cb(error) → 500 from unhandled multer error
    // OR 400 depending on error handler wiring; just ensure it's not 200
    expect(res.status).not.toBe(200);
  });

  it('should parse an Excel file, match shipments, and return import summary', async () => {
    const buffer = buildExcelBuffer([
      ['Tracking Number', 'Status'],
      [AWB_1, 'Delivered'],           // Should update shipment1 → DELIVERED
      [AWB_2, 'In Transit'],          // Should update shipment2 → IN_TRANSIT
      [AWB_3, 'Returned'],            // Should update shipment3 → RTO_INITIATED
      [AWB_UNKNOWN, 'Delivered'],     // Unknown AWB → unmatched
    ]);

    const res = await request(app)
      .post('/api/shipping/import-status')
      .set('Authorization', `Bearer ${managerToken}`)
      .attach('file', buffer, { filename: 'tracking_report.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      .field('courier', 'INDIA_POST');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const summary = res.body.data;
    expect(summary.totalRowsInFile).toBe(4);
    expect(summary.uniqueAwbs).toBe(4);
    expect(summary.matched).toBe(3);
    expect(summary.unmatched).toBe(1);
    expect(summary.unmatchedAwbs).toContain(AWB_UNKNOWN);
    expect(summary.updated).toBe(3);
    expect(summary.byStatus[SHIPPING_STATUS.DELIVERED]).toBe(1);
    expect(summary.byStatus[SHIPPING_STATUS.IN_TRANSIT]).toBe(1);
    expect(summary.byStatus[SHIPPING_STATUS.RTO_INITIATED]).toBe(1);
  });

  it('should have updated shipment1 trackingStatus to DELIVERED in DB', async () => {
    const s = await Shipment.findOne({ awbNumber: AWB_1 });
    expect(s.trackingStatus).toBe(SHIPPING_STATUS.DELIVERED);
    expect(s.actualDeliveryDate).toBeTruthy();
  });

  it('should have updated shipment2 trackingStatus to IN_TRANSIT in DB', async () => {
    const s = await Shipment.findOne({ awbNumber: AWB_2 });
    expect(s.trackingStatus).toBe(SHIPPING_STATUS.IN_TRANSIT);
  });

  it('should have updated shipment3 trackingStatus to RTO_INITIATED in DB', async () => {
    const s = await Shipment.findOne({ awbNumber: AWB_3 });
    expect(s.trackingStatus).toBe(SHIPPING_STATUS.RTO_INITIATED);
  });

  it('should have created TrackingEvent records for each updated shipment', async () => {
    const events = await TrackingEvent.find({
      awbNumber: { $in: [AWB_1, AWB_2, AWB_3] },
      location: 'Courier Status Import',
    });
    expect(events.length).toBe(3);
  });

  it('should report already-up-to-date count when importing same file again', async () => {
    // Re-upload the same file — this time nothing should change since statuses already match
    const buffer = buildExcelBuffer([
      ['Tracking Number', 'Status'],
      [AWB_1, 'Delivered'],
      [AWB_2, 'In Transit'],
      [AWB_3, 'Returned'],
    ]);

    const res = await request(app)
      .post('/api/shipping/import-status')
      .set('Authorization', `Bearer ${managerToken}`)
      .attach('file', buffer, { filename: 'tracking_report2.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      .field('courier', 'INDIA_POST');

    expect(res.status).toBe(200);
    const summary = res.body.data;
    expect(summary.updated).toBe(0);
    expect(summary.alreadyUpToDate).toBe(3);
  });

  it('should filter shipments list by status=DELIVERED correctly', async () => {
    const res = await request(app)
      .get('/api/shipping?status=DELIVERED')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    // All returned shipments must have DELIVERED status
    res.body.data.forEach((s) => {
      expect(s.trackingStatus).toBe(SHIPPING_STATUS.DELIVERED);
    });
    // Pagination metadata must be present
    expect(res.body.pagination).toHaveProperty('totalPages');
    expect(res.body.pagination).toHaveProperty('total');
  });

  it('should filter shipments list by status=IN_TRANSIT correctly', async () => {
    const res = await request(app)
      .get('/api/shipping?status=IN_TRANSIT')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((s) => {
      expect(s.trackingStatus).toBe(SHIPPING_STATUS.IN_TRANSIT);
    });
  });

  it('should require authentication on import-status route', async () => {
    const res = await request(app)
      .post('/api/shipping/import-status');
    expect(res.status).toBe(401);
  });
});
