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

  it("should return VAPID public key via GET /api/notifications/vapid-public-key", async () => {
    const res = await request(app).get("/api/notifications/vapid-public-key");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("publicKey");
    expect(res.body.data.domain).toBe("shanthiayurvedas.com");
  });

  it("should register push subscription via POST /api/notifications/subscribe", async () => {
    const sub = {
      endpoint: "https://fcm.googleapis.com/fcm/send/sample-integration-test-endpoint",
      keys: {
        p256dh: "BMm45B3...test",
        auth: "authKey123"
      }
    };
    const res = await request(app)
      .post("/api/notifications/subscribe")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ subscription: sub });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should unsubscribe push subscription via POST /api/notifications/unsubscribe", async () => {
    const res = await request(app)
      .post("/api/notifications/unsubscribe")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ endpoint: "https://fcm.googleapis.com/fcm/send/sample-integration-test-endpoint" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should dispatch test push alert via POST /api/notifications/test-push", async () => {
    const res = await request(app)
      .post("/api/notifications/test-push")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should delete an individual notification via DELETE /api/notifications/:id", async () => {
    const createRes = await request(app)
      .post("/api/notifications/simulate-lead-assign")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(createRes.status).toBe(200);

    const listRes = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(listRes.body.data.length).toBeGreaterThan(0);
    const targetId = listRes.body.data[0]._id;

    const deleteRes = await request(app)
      .delete(`/api/notifications/${targetId}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });

  it("should clear all notifications via POST /api/notifications/clear-all", async () => {
    // Generate a couple notifications
    await request(app)
      .post("/api/notifications/simulate-lead-assign")
      .set("Authorization", `Bearer ${ownerToken}`);
    await request(app)
      .post("/api/notifications/simulate-followup-due")
      .set("Authorization", `Bearer ${ownerToken}`);

    const clearRes = await request(app)
      .post("/api/notifications/clear-all")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(clearRes.status).toBe(200);
    expect(clearRes.body.success).toBe(true);

    const afterList = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(afterList.body.data.length).toBe(0);
  });

  it("should send lead assigned notification ONLY to the person assigned and not other telecallers in the branch", async () => {
    const branch = await Branch.findOne({ code: "HSR" });

    // Create two telecallers in the same branch
    const tc1 = await User.create({
      name: "Telecaller One",
      email: `tc1.${Date.now()}@shanthiayurvedas.com`,
      passwordHash: await User.hashPassword("Password@12345"),
      role: ROLES.TELECALLER,
      branchId: branch._id,
      branches: [branch._id],
      isActive: true
    });
    const tc1Login = await request(app).post("/api/auth/login").send({ email: tc1.email, password: "Password@12345" });
    const tc1Token = tc1Login.body.data.accessToken;

    const tc2 = await User.create({
      name: "Telecaller Two",
      email: `tc2.${Date.now()}@shanthiayurvedas.com`,
      passwordHash: await User.hashPassword("Password@12345"),
      role: ROLES.TELECALLER,
      branchId: branch._id,
      branches: [branch._id],
      isActive: true
    });
    const tc2Login = await request(app).post("/api/auth/login").send({ email: tc2.email, password: "Password@12345" });
    const tc2Token = tc2Login.body.data.accessToken;

    // Simulate lead assigned to TC1
    const assignRes = await request(app)
      .post("/api/notifications/simulate-lead-assign")
      .set("Authorization", `Bearer ${tc1Token}`)
      .send({ userId: tc1._id, name: "Exclusive Lead For TC1", mobile: "9988776655" });
    expect(assignRes.status).toBe(200);

    // TC1 must see the notification
    const tc1List = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${tc1Token}`);
    expect(tc1List.status).toBe(200);
    expect(tc1List.body.data.length).toBeGreaterThan(0);
    expect(tc1List.body.data.some((n) => n.data?.name === "Exclusive Lead For TC1")).toBe(true);

    // TC2 (in the exact same branch) must NOT see TC1's notification
    const tc2List = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${tc2Token}`);
    expect(tc2List.status).toBe(200);
    expect(tc2List.body.data.some((n) => n.data?.name === "Exclusive Lead For TC1")).toBe(false);
  });
});

