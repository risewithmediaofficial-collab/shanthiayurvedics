import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { Branch } from "../src/models/Branch.js";
import { ROLES } from "../src/constants/roles.js";
import "./setup.js";

// Reports: GET /api/reports/sales (paginated), GET /api/reports/leads, GET /api/reports/delivery
// Notifications: GET /api/notifications, POST /api/notifications/read-all, PATCH /api/notifications/:id/read

describe("Reports Module Integration Tests", () => {
  let branch, ownerToken, managerToken;

  beforeAll(async () => {
    branch = await Branch.findOne({ code: "HSR" });

    const owner = await User.create({ name: "Owner Reports", email: "owner.reports@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.OWNER, branchId: branch._id, branches: [branch._id], isActive: true });
    const ownerLogin = await request(app).post("/api/auth/login").send({ email: owner.email, password: "Password@12345" });
    ownerToken = ownerLogin.body.data.accessToken;

    const manager = await User.create({ name: "Manager Reports", email: "manager.reports@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.MANAGER, branchId: branch._id, branches: [branch._id], isActive: true });
    const managerLogin = await request(app).post("/api/auth/login").send({ email: manager.email, password: "Password@12345" });
    managerToken = managerLogin.body.data.accessToken;
  });

  it("should return sales report as paginated array with pagination key", async () => {
    const res = await request(app).get("/api/reports/sales").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // getSalesReport uses ApiResponse.paginated -> returns res.body.data as array, res.body.pagination
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination).toHaveProperty("total");
  });

  it("should support date range filter on sales report", async () => {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const to = new Date().toISOString().split("T")[0];
    const res = await request(app).get(`/api/reports/sales?startDate=${from}&endDate=${to}`).set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should return leads report with bySource and byStatus breakdown", async () => {
    const res = await request(app).get("/api/reports/leads").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Returns { bySource: [], byStatus: [] }
    expect(res.body.data).toHaveProperty("bySource");
    expect(res.body.data).toHaveProperty("byStatus");
  });

  it("should return delivery report", async () => {
    const res = await request(app).get("/api/reports/delivery").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it("should return sales report for manager (branch scoped)", async () => {
    const res = await request(app).get("/api/reports/sales").set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should reject report access for telecaller (RBAC 403)", async () => {
    const tc = await User.create({ name: "TC Reports", email: "tc.reports@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.TELECALLER, branchId: branch._id, branches: [branch._id], isActive: true });
    const tcLogin = await request(app).post("/api/auth/login").send({ email: tc.email, password: "Password@12345" });
    const tcToken = tcLogin.body.data.accessToken;
    const res = await request(app).get("/api/reports/sales").set("Authorization", `Bearer ${tcToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe("Notifications Module Integration Tests", () => {
  let ownerToken;

  beforeAll(async () => {
    const branch = await Branch.findOne({ code: "HSR" });
    const owner = await User.create({ name: "Owner Notif", email: "owner.notif@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.OWNER, branchId: branch._id, branches: [branch._id], isActive: true });
    const ownerLogin = await request(app).post("/api/auth/login").send({ email: owner.email, password: "Password@12345" });
    ownerToken = ownerLogin.body.data.accessToken;
  });

  it("should get notifications for the authenticated user", async () => {
    const res = await request(app).get("/api/notifications").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should mark all notifications as read via POST /api/notifications/read-all", async () => {
    const res = await request(app).post("/api/notifications/read-all").set("Authorization", `Bearer ${ownerToken}`);
    expect([200, 204]).toContain(res.status);
  });
});
