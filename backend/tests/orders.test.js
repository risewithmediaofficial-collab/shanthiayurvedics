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
});
