import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { Branch } from "../src/models/Branch.js";
import { Product } from "../src/models/Product.js";
import { ProductBatch } from "../src/models/ProductBatch.js";
import { Inventory } from "../src/models/Inventory.js";
import { ROLES } from "../src/constants/roles.js";
import "./setup.js";

describe("Inventory Module Integration Tests (Stock In / Out / Adjustments / Transfers)", () => {
  let branch, branch2, managerToken, productId, batchId;

  beforeAll(async () => {
    branch = await Branch.findOne({ code: "HSR" });
    branch2 = await Branch.create({ name: "Salem Test Branch", code: "SLM2", phone: "+91 98421 22334", email: "salem2@shanthiayurvedas.com", isActive: true });

    const manager = await User.create({
      name: "Manager Inv2",
      email: "manager.inv2@shanthiayurvedas.com",
      passwordHash: await User.hashPassword("Password@12345"),
      role: ROLES.MANAGER,
      branchId: branch._id,
      branches: [branch._id, branch2._id],
      isActive: true
    });
    const ml = await request(app).post("/api/auth/login").send({ email: manager.email, password: "Password@12345" });
    managerToken = ml.body.data.accessToken;

    const product = await Product.create({ name: "Triphala Churna 100g", sku: "TPC-100", category: "CHURNAS", price: 199, mrp: 249, costPrice: 80 });
    productId = product._id.toString();
    const batch = await ProductBatch.create({ productId: product._id, batchNumber: "TPC-B01", manufacturingDate: new Date(), expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), mrp: 249 });
    batchId = batch._id.toString();
  });

  it("should receive stock (Stock In) and update inventory", async () => {
    const res = await request(app).post("/api/inventory/in").set("Authorization", `Bearer ${managerToken}`).send({ productId, batchId, branchId: branch._id.toString(), quantity: 100, reason: "PURCHASE", notes: "Initial stock" });
    expect(res.status).toBe(200);
    expect(res.body.data.inventory.availableQuantity).toBe(100);
    expect(res.body.data.movement.type).toBe("IN");
  });

  it("should record Stock Out and reduce inventory", async () => {
    const res = await request(app).post("/api/inventory/out").set("Authorization", `Bearer ${managerToken}`).send({ productId, batchId, branchId: branch._id.toString(), quantity: 10, reason: "DAMAGED", notes: "10 damaged units" });
    expect(res.status).toBe(200);
    expect(res.body.data.inventory.availableQuantity).toBe(90);
    expect(res.body.data.movement.type).toBe("OUT");
  });

  it("should reject stock out exceeding available quantity", async () => {
    const res = await request(app).post("/api/inventory/out").set("Authorization", `Bearer ${managerToken}`).send({ productId, batchId, branchId: branch._id.toString(), quantity: 9999, reason: "DAMAGED" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should create a stock adjustment using newAvailable", async () => {
    const res = await request(app).post("/api/inventory/adjust").set("Authorization", `Bearer ${managerToken}`).send({ productId, batchId, branchId: branch._id.toString(), newAvailable: 95, reason: "Physical stock count correction" });
    expect(res.status).toBe(200);
    const inv = await Inventory.findOne({ productId, branchId: branch._id });
    expect(inv.availableQuantity).toBe(95);
  });

  it("should get stock movements ledger for a product", async () => {
    const res = await request(app).get(`/api/inventory/movements?productId=${productId}`).set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  let transferId;

  it("should create a stock transfer request", async () => {
    const res = await request(app).post("/api/inventory/transfers").set("Authorization", `Bearer ${managerToken}`).send({
      fromBranchId: branch._id.toString(),
      toBranchId: branch2._id.toString(),
      items: [{ productId, batchId, quantity: 20 }],
      notes: "Inter-branch transfer for Salem outlet"
    });
    expect(res.status).toBe(201);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.status).toBe("REQUESTED");
    transferId = res.body.data._id;
  });

  it("should list stock transfers", async () => {
    const res = await request(app).get("/api/inventory/transfers").set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("should dispatch and then receive the stock transfer", async () => {
    expect(transferId).toBeDefined();

    // 1. Dispatch transfer -> status becomes IN_TRANSIT
    const dispatchRes = await request(app).patch(`/api/inventory/transfers/${transferId}/dispatch`).set("Authorization", `Bearer ${managerToken}`).send({ trackingNumber: "TRK-001" });
    expect(dispatchRes.status).toBe(200);
    expect(dispatchRes.body.data.status).toBe("IN_TRANSIT");

    // 2. Receive transfer at destination branch
    const receiveRes = await request(app).patch(`/api/inventory/transfers/${transferId}/receive`).set("Authorization", `Bearer ${managerToken}`);
    expect(receiveRes.status).toBe(200);
    expect(receiveRes.body.data.status).toBe("RECEIVED");

    // 3. Verify destination branch received 20 units
    const destInv = await Inventory.findOne({ productId, branchId: branch2._id });
    expect(destInv.availableQuantity).toBe(20);

    // 4. Source branch reduced to 95 - 20 = 75
    const srcInv = await Inventory.findOne({ productId, branchId: branch._id });
    expect(srcInv.availableQuantity).toBe(75);
  });

  it("should list all inventory items with stock levels", async () => {
    const res = await request(app).get("/api/inventory").set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const item = res.body.data.find((i) => i.productId?.sku === "TPC-100" || i.productId?._id?.toString() === productId);
    expect(item).toBeDefined();
  });
});
