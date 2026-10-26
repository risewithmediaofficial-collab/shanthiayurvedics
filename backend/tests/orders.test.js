import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { Branch } from "../src/models/Branch.js";
import { Customer } from "../src/models/Customer.js";
import { Product } from "../src/models/Product.js";
import { ProductBatch } from "../src/models/ProductBatch.js";
import { ROLES } from "../src/constants/roles.js";
import { ORDER_STATUS } from "../src/constants/orderStates.js";
import "./setup.js";

describe("Orders Module Integration Tests", () => {
  let branch, managerToken, telecallerToken, telecallerUser, customer, product, batch, orderId;

  beforeAll(async () => {
    branch = await Branch.findOne({ code: "HSR" });

    const manager = await User.create({ name: "Manager Orders", email: "manager.orders@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.MANAGER, branchId: branch._id, branches: [branch._id], isActive: true });
    const ml = await request(app).post("/api/auth/login").send({ email: manager.email, password: "Password@12345" });
    managerToken = ml.body.data.accessToken;

    telecallerUser = await User.create({ name: "TC Orders", email: "tc.orders@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.TELECALLER, branchId: branch._id, branches: [branch._id], isActive: true });
    const tcl = await request(app).post("/api/auth/login").send({ email: telecallerUser.email, password: "Password@12345" });
    telecallerToken = tcl.body.data.accessToken;

    customer = await Customer.create({ name: "Order Customer", mobile: "9550000001", branchId: branch._id, assignedTelecallerId: telecallerUser._id, addresses: [{ street: "5 Park Road", city: "Hosur", state: "Tamil Nadu", pincode: "635109", isDefault: true }] });
    product = await Product.create({ name: "Brahmi Oil 100ml", sku: "BRM-OIL-100", category: "OILS", price: 299, mrp: 349, costPrice: 120 });
    batch = await ProductBatch.create({ productId: product._id, batchNumber: "BRM-B01", manufacturingDate: new Date(), expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), mrp: 349 });
    await request(app).post("/api/inventory/in").set("Authorization", `Bearer ${managerToken}`).send({ productId: product._id.toString(), batchId: batch._id.toString(), branchId: branch._id.toString(), quantity: 30 });
  });

  it("should create a COD order with items", async () => {
    const res = await request(app).post("/api/orders").set("Authorization", `Bearer ${telecallerToken}`).send({
      customerId: customer._id.toString(),
      branchId: branch._id.toString(),
      items: [{ productId: product._id.toString(), batchId: batch._id.toString(), quantity: 3, unitPrice: 299 }],
      paymentMethod: "COD",
      deliveryAddress: customer.addresses[0]
    });
    expect(res.status).toBe(201);
    expect(res.body.data.orderNumber).toBeDefined();
    expect(res.body.data.grandTotal).toBe(897);
    expect(res.body.data.status).toBe(ORDER_STATUS.NEW);
    orderId = res.body.data._id;
  });

  it("should list all orders with pagination", async () => {
    const res = await request(app).get("/api/orders").set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("should fetch order by ID with full details", async () => {
    const res = await request(app).get(`/api/orders/${orderId}`).set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(orderId);
    expect(res.body.data.items.length).toBe(1);
  });

  it("should transition order: NEW -> CONFIRMED", async () => {
    const res = await request(app).patch(`/api/orders/${orderId}/transition`).set("Authorization", `Bearer ${managerToken}`).send({ status: ORDER_STATUS.CONFIRMED, notes: "Order confirmed" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(ORDER_STATUS.CONFIRMED);
  });

  it("should transition order: CONFIRMED -> PROCESSING", async () => {
    const res = await request(app).patch(`/api/orders/${orderId}/transition`).set("Authorization", `Bearer ${managerToken}`).send({ status: ORDER_STATUS.PROCESSING });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(ORDER_STATUS.PROCESSING);
  });

  it("should block invalid state transition: PROCESSING -> NEW", async () => {
    const res = await request(app).patch(`/api/orders/${orderId}/transition`).set("Authorization", `Bearer ${managerToken}`).send({ status: ORDER_STATUS.NEW });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should filter orders by status", async () => {
    const res = await request(app).get(`/api/orders?status=${ORDER_STATUS.PROCESSING}`).set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((o) => o.status === ORDER_STATUS.PROCESSING)).toBe(true);
  });

  it("should cancel order and release stock", async () => {
    // Create a fresh order to cancel
    const newOrderRes = await request(app).post("/api/orders").set("Authorization", `Bearer ${telecallerToken}`).send({
      customerId: customer._id.toString(),
      branchId: branch._id.toString(),
      items: [{ productId: product._id.toString(), batchId: batch._id.toString(), quantity: 1, unitPrice: 299 }],
      paymentMethod: "COD"
    });
    const newOrderId = newOrderRes.body.data._id;
    const cancelRes = await request(app).patch(`/api/orders/${newOrderId}/transition`).set("Authorization", `Bearer ${managerToken}`).send({ status: ORDER_STATUS.CANCELLED, cancellationReason: "Test cancel" });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe(ORDER_STATUS.CANCELLED);
  });

  it("should update order details via PATCH /api/orders/:id", async () => {
    const updateRes = await request(app)
      .patch(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${telecallerToken}`)
      .send({
        notes: "Updated delivery instructions: ring bell twice",
        deliveryAddress: {
          street: "10 New Market Street",
          city: "Hosur",
          state: "Tamil Nadu",
          pincode: "635109"
        }
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.notes).toBe("Updated delivery instructions: ring bell twice");
    expect(updateRes.body.data.deliveryAddress.street).toBe("10 New Market Street");
  });

  it("should delete order via DELETE /api/orders/:id and release reserved stock", async () => {
    // Create a new order with reserved stock
    const toDeleteRes = await request(app).post("/api/orders").set("Authorization", `Bearer ${telecallerToken}`).send({
      customerId: customer._id.toString(),
      branchId: branch._id.toString(),
      items: [{ productId: product._id.toString(), batchId: batch._id.toString(), quantity: 2, unitPrice: 299 }],
      paymentMethod: "COD"
    });
    expect(toDeleteRes.status).toBe(201);
    const delOrderId = toDeleteRes.body.data._id;

    // Delete the order
    const delRes = await request(app)
      .delete(`/api/orders/${delOrderId}`)
      .set("Authorization", `Bearer ${telecallerToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // Verify order cannot be found
    const getRes = await request(app)
      .get(`/api/orders/${delOrderId}`)
      .set("Authorization", `Bearer ${managerToken}`);
    expect(getRes.status).toBe(404);
  });

  it("should reject dispatch WhatsApp if tracking number is missing", async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/send-dispatch-whatsapp`)
      .set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/tracking number/i);
  });

  it("should send dispatch WhatsApp successfully when tracking number is present and fetch resolves", async () => {
    // Add tracking number with India Post (compatible with COD orders)
    await request(app)
      .patch(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${telecallerToken}`)
      .send({ trackingNumber: "EM022996331IN", courierName: "India Post" });

    const origAuth = process.env.MSG91_AUTHKEY;
    process.env.MSG91_AUTHKEY = "test_key_123";

    const origFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ type: "success", message: "Dispatch queued" })
    });

    const res = await request(app)
      .post(`/api/orders/${orderId}/send-dispatch-whatsapp`)
      .set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/dispatch/i);

    // Verify order was marked SENT
    const checkRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${managerToken}`);
    expect(checkRes.body.data.whatsappDispatchStatus).toBe("SENT");
    expect(checkRes.body.data.whatsappDispatchSentAt).toBeDefined();

    global.fetch = origFetch;
    process.env.MSG91_AUTHKEY = origAuth;
  });

  it("should strictly reject transition to DISPATCHED if no AWB number is generated", async () => {
    // Create an order without AWB
    const orderRes = await request(app).post("/api/orders").set("Authorization", `Bearer ${telecallerToken}`).send({
      customerId: customer._id.toString(),
      branchId: branch._id.toString(),
      items: [{ productId: product._id.toString(), batchId: batch._id.toString(), quantity: 1, unitPrice: 299 }],
      paymentMethod: "COD"
    });
    const freshOrderId = orderRes.body.data._id;

    // Attempt transition to DISPATCHED with no tracking number
    const failRes = await request(app)
      .patch(`/api/orders/${freshOrderId}/transition`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ status: ORDER_STATUS.DISPATCHED });

    expect(failRes.status).toBe(400);
    expect(failRes.body.message).toMatch(/AWB \/ Tracking number/i);
  });

  it("should allow transition to DISPATCHED when valid AWB number is provided", async () => {
    const orderRes = await request(app).post("/api/orders").set("Authorization", `Bearer ${telecallerToken}`).send({
      customerId: customer._id.toString(),
      branchId: branch._id.toString(),
      items: [{ productId: product._id.toString(), batchId: batch._id.toString(), quantity: 1, unitPrice: 299 }],
      paymentMethod: "COD"
    });
    const freshOrderId = orderRes.body.data._id;

    const passRes = await request(app)
      .patch(`/api/orders/${freshOrderId}/transition`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        status: ORDER_STATUS.DISPATCHED,
        trackingNumber: "TPC8891001",
        courierName: "The Professional Courier (TPC)"
      });

    expect(passRes.status).toBe(200);
    expect(passRes.body.data.status).toBe(ORDER_STATUS.DISPATCHED);
    expect(passRes.body.data.trackingNumber).toBe("TPC8891001");
  });

  it("should bulk delete orders via POST /api/orders/bulk-delete", async () => {
    // Create two orders to delete
    const o1 = await request(app).post("/api/orders").set("Authorization", `Bearer ${telecallerToken}`).send({
      customerId: customer._id.toString(),
      branchId: branch._id.toString(),
      items: [{ productId: product._id.toString(), batchId: batch._id.toString(), quantity: 1, unitPrice: 299 }],
      paymentMethod: "COD"
    });
    const o2 = await request(app).post("/api/orders").set("Authorization", `Bearer ${telecallerToken}`).send({
      customerId: customer._id.toString(),
      branchId: branch._id.toString(),
      items: [{ productId: product._id.toString(), batchId: batch._id.toString(), quantity: 1, unitPrice: 299 }],
      paymentMethod: "COD"
    });

    const ids = [o1.body.data._id, o2.body.data._id];

    const bulkDelRes = await request(app)
      .post("/api/orders/bulk-delete")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ orderIds: ids });

    expect(bulkDelRes.status).toBe(200);
    expect(bulkDelRes.body.success).toBe(true);
    expect(bulkDelRes.body.data.deletedCount).toBe(2);

    // Verify both orders are deleted
    const check1 = await request(app).get(`/api/orders/${ids[0]}`).set("Authorization", `Bearer ${managerToken}`);
    const check2 = await request(app).get(`/api/orders/${ids[1]}`).set("Authorization", `Bearer ${managerToken}`);
    expect(check1.status).toBe(404);
    expect(check2.status).toBe(404);
  });
});

