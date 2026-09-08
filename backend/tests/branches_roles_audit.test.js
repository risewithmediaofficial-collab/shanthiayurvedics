import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { Branch } from "../src/models/Branch.js";
import { ROLES } from "../src/constants/roles.js";
import "./setup.js";

describe("Branch Management Integration Tests", () => {
  let branch, ownerToken, managerToken, createdBranchId;

  beforeAll(async () => {
    branch = await Branch.findOne({ code: "HSR" });

    const owner = await User.create({ name: "Owner Branches", email: "owner.branches@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.OWNER, branchId: branch._id, branches: [branch._id], isActive: true });
    const ownerLogin = await request(app).post("/api/auth/login").send({ email: owner.email, password: "Password@12345" });
    ownerToken = ownerLogin.body.data.accessToken;

    const manager = await User.create({ name: "Manager Branches", email: "manager.branches@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.MANAGER, branchId: branch._id, branches: [branch._id], isActive: true });
    const managerLogin = await request(app).post("/api/auth/login").send({ email: manager.email, password: "Password@12345" });
    managerToken = managerLogin.body.data.accessToken;
  });

  it("should list all branches", async () => {
    const res = await request(app).get("/api/branches").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("should create a new branch (Owner only)", async () => {
    const res = await request(app).post("/api/branches").set("Authorization", `Bearer ${ownerToken}`).send({ name: "Vellore Test Branch", code: "VLR", phone: "+91 98421 33445", email: "vellore@shanthiayurvedas.com" });
    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe("VLR");
    createdBranchId = res.body.data._id;
  });

  it("should update branch details via PATCH /:id", async () => {
    const res = await request(app).patch(`/api/branches/${createdBranchId}`).set("Authorization", `Bearer ${ownerToken}`).send({ name: "Vellore Main Branch", phone: "+91 98421 44556" });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Vellore Main Branch");
  });

  it("should reject duplicate branch code", async () => {
    const res = await request(app).post("/api/branches").set("Authorization", `Bearer ${ownerToken}`).send({ name: "Another Hosur", code: "HSR" });
    expect([400, 409]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it("should reject branch creation by Manager (RBAC)", async () => {
    const res = await request(app).post("/api/branches").set("Authorization", `Bearer ${managerToken}`).send({ name: "Manager Branch Attempt", code: "MGR1" });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should list branches via admin endpoint", async () => {
    const res = await request(app).get("/api/branches/admin").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe("Roles & Permissions Integration Tests", () => {
  let ownerToken;

  beforeAll(async () => {
    const branch = await Branch.findOne({ code: "HSR" });
    const owner = await User.create({ name: "Owner Roles", email: "owner.roles@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.OWNER, branchId: branch._id, branches: [branch._id], isActive: true });
    const ownerLogin = await request(app).post("/api/auth/login").send({ email: owner.email, password: "Password@12345" });
    ownerToken = ownerLogin.body.data.accessToken;
  });

  it("should list all roles", async () => {
    const res = await request(app).get("/api/roles").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("should list all permissions", async () => {
    const res = await request(app).get("/api/roles/permissions").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe("Audit Log Integration Tests", () => {
  let ownerToken;

  beforeAll(async () => {
    const branch = await Branch.findOne({ code: "HSR" });
    const owner = await User.create({ name: "Owner Audit", email: "owner.audit@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.OWNER, branchId: branch._id, branches: [branch._id], isActive: true });
    const ownerLogin = await request(app).post("/api/auth/login").send({ email: owner.email, password: "Password@12345" });
    ownerToken = ownerLogin.body.data.accessToken;
  });

  it("should return audit log entries after any action", async () => {
    const res = await request(app).get("/api/audit").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should filter audit logs by module", async () => {
    const res = await request(app).get("/api/audit?module=users").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
