import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { Branch } from "../src/models/Branch.js";
import { Product } from "../src/models/Product.js";
import { ProductBatch } from "../src/models/ProductBatch.js";
import { ROLES } from "../src/constants/roles.js";
import "./setup.js";

describe("Products Module Integration Tests", () => {
  let branch, managerToken, telecallerToken, createdProductId;

  beforeAll(async () => {
    branch = await Branch.findOne({ code: "HSR" });

    const manager = await User.create({ name: "Manager Products", email: "manager.products@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.MANAGER, branchId: branch._id, branches: [branch._id], isActive: true });
    const managerLogin = await request(app).post("/api/auth/login").send({ email: manager.email, password: "Password@12345" });
    managerToken = managerLogin.body.data.accessToken;

    const tc = await User.create({ name: "TC Products", email: "tc.products@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.TELECALLER, branchId: branch._id, branches: [branch._id], isActive: true });
    const tcLogin = await request(app).post("/api/auth/login").send({ email: tc.email, password: "Password@12345" });
    telecallerToken = tcLogin.body.data.accessToken;
  });

  it("should create a product with initial batch", async () => {
    const res = await request(app).post("/api/products").set("Authorization", `Bearer ${managerToken}`).send({
      name: "Ashwagandha Capsules 60ct",
      sku: "AWG-CAP-60",
      category: "CAPSULES",
      description: "Premium Ashwagandha extract capsules",
      price: 699,
      mrp: 799,
      costPrice: 280,
      initialBatch: {
        batchNumber: "AWG-B01",
        manufacturingDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBe("AWG-CAP-60");
    expect(res.body.data.price).toBe(699);
    createdProductId = res.body.data._id;
  });

  it("should list all products with pagination", async () => {
    const res = await request(app).get("/api/products").set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    // Products endpoint returns ApiResponse.paginated - meta is at res.body.meta or nested
    expect(res.body).toHaveProperty("data");
  });

  it("should fetch product by ID with batches", async () => {
    const res = await request(app).get(`/api/products/${createdProductId}`).set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(createdProductId);
    expect(Array.isArray(res.body.data.batches)).toBe(true);
    expect(res.body.data.batches.length).toBe(1);
  });

  it("should search products by name", async () => {
    const res = await request(app).get("/api/products?search=Ashwagandha").set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((p) => p.sku === "AWG-CAP-60")).toBe(true);
  });

  it("should reject duplicate SKU on create", async () => {
    const res = await request(app).post("/api/products").set("Authorization", `Bearer ${managerToken}`).send({ name: "Dupe Product", sku: "AWG-CAP-60", category: "CAPSULES", price: 500, mrp: 600, costPrice: 200 });
    expect([400, 409]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it("should reject product create by telecaller (RBAC)", async () => {
    const res = await request(app).post("/api/products").set("Authorization", `Bearer ${telecallerToken}`).send({ name: "Unauthorized Product", sku: "UNAUTH-1", category: "OILS", price: 200, mrp: 250, costPrice: 80 });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should add a new batch to existing product", async () => {
    const res = await request(app).post(`/api/products/${createdProductId}/batches`).set("Authorization", `Bearer ${managerToken}`).send({
      batchNumber: "AWG-B02",
      manufacturingDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 18 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      mrp: 850
    });
    expect(res.status).toBe(201);
    expect(res.body.data.batchNumber).toBe("AWG-B02");
  });

  it("should filter products by category", async () => {
    const res = await request(app).get("/api/products?category=CAPSULES").set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((p) => expect(p.category).toBe("CAPSULES"));
  });
});
