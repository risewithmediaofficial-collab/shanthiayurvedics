import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { Branch } from "../src/models/Branch.js";
import { Lead } from "../src/models/Lead.js";
import { Customer } from "../src/models/Customer.js";
import { ROLES } from "../src/constants/roles.js";
import "./setup.js";

describe("Dashboard Module Integration Tests", () => {
  let branch, ownerToken, managerToken, telecallerToken, telecallerUser;

  beforeAll(async () => {
    branch = await Branch.findOne({ code: "HSR" });

    const owner = await User.create({ name: "Owner Dashboard", email: "owner.dash@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.OWNER, branchId: branch._id, branches: [branch._id], isActive: true });
    const ownerLogin = await request(app).post("/api/auth/login").send({ email: owner.email, password: "Password@12345" });
    ownerToken = ownerLogin.body.data.accessToken;

    const manager = await User.create({ name: "Manager Dashboard", email: "manager.dash@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.MANAGER, branchId: branch._id, branches: [branch._id], isActive: true });
    const managerLogin = await request(app).post("/api/auth/login").send({ email: manager.email, password: "Password@12345" });
    managerToken = managerLogin.body.data.accessToken;

    telecallerUser = await User.create({ name: "TC Dashboard", email: "tc.dash@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.TELECALLER, branchId: branch._id, branches: [branch._id], isActive: true });
    const tcLogin = await request(app).post("/api/auth/login").send({ email: telecallerUser.email, password: "Password@12345" });
    telecallerToken = tcLogin.body.data.accessToken;

    // Seed leads
    await Lead.create([
      { name: "Dash Lead 1", mobile: "7700000001", source: "CALL", branchId: branch._id, assignedTo: telecallerUser._id },
      { name: "Dash Lead 2", mobile: "7700000002", source: "WHATSAPP", branchId: branch._id, assignedTo: telecallerUser._id }
    ]);
    await Customer.create({ name: "Dash Customer 1", mobile: "7700000003", branchId: branch._id, assignedTelecallerId: telecallerUser._id, addresses: [{ street: "1 Main", city: "Hosur", state: "Tamil Nadu", pincode: "635109" }] });
  });

  it("should return Owner dashboard with kpis including allTimeRevenue and totalLeads", async () => {
    const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("kpis");
    // Actual field names from DashboardService.getOwnerDashboard
    expect(res.body.data.kpis).toHaveProperty("allTimeRevenue");
    expect(res.body.data.kpis).toHaveProperty("totalOrders");
    expect(res.body.data.kpis).toHaveProperty("totalLeads");
    expect(res.body.data.kpis).toHaveProperty("convertedLeads");
  });

  it("should return Manager dashboard with branch-scoped kpis", async () => {
    const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("kpis");
  });

  it("should return Telecaller dashboard with personal stats and team performance summary", async () => {
    const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${telecallerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("kpis");
    expect(res.body.data).toHaveProperty("teamPerformance");
    expect(Array.isArray(res.body.data.teamPerformance)).toBe(true);
    // Actual field names from DashboardService.getTelecallerDashboard
    expect(res.body.data.kpis).toHaveProperty("newAssignedLeads");
    expect(res.body.data.kpis).toHaveProperty("totalAssignedLeads");
    expect(res.body.data.kpis).toHaveProperty("todayFollowups");

    const firstEntry = res.body.data.teamPerformance[0];
    expect(firstEntry).toHaveProperty("employeeName");
    expect(firstEntry).toHaveProperty("ordersCreated");
    expect(firstEntry).toHaveProperty("leadsFollowed");
    expect(firstEntry).toHaveProperty("revenue");
  });

  it("should return totalLeads > 0 in owner dashboard after seeding", async () => {
    const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.kpis.totalLeads).toBeGreaterThan(0);
  });
});
