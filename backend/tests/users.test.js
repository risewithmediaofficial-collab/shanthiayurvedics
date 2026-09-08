import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { Branch } from "../src/models/Branch.js";
import { ROLES } from "../src/constants/roles.js";
import "./setup.js";

describe("Users & Staff Management Integration Tests", () => {
  let branch, ownerToken, createdUserId;

  beforeAll(async () => {
    branch = await Branch.findOne({ code: "HSR" });
    const owner = await User.create({ name: "Owner Users", email: "owner.users@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.OWNER, branchId: branch._id, branches: [branch._id], isActive: true });
    const ownerLogin = await request(app).post("/api/auth/login").send({ email: owner.email, password: "Password@12345" });
    ownerToken = ownerLogin.body.data.accessToken;
  });

  it("should list all users", async () => {
    const res = await request(app).get("/api/users").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination).toHaveProperty("total");
  });

  it("should create a new telecaller staff member", async () => {
    const res = await request(app).post("/api/users").set("Authorization", `Bearer ${ownerToken}`).send({ name: "New Telecaller", email: "newtc.test@shanthiayurvedas.com", password: "Password@12345", role: ROLES.TELECALLER, branchId: branch._id.toString() });
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe("newtc.test@shanthiayurvedas.com");
    expect(res.body.data.role).toBe(ROLES.TELECALLER);
    createdUserId = res.body.data._id;
  });

  it("should fetch user by ID", async () => {
    const res = await request(app).get(`/api/users/${createdUserId}`).set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(createdUserId);
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it("should update user name and phone", async () => {
    const res = await request(app).patch(`/api/users/${createdUserId}`).set("Authorization", `Bearer ${ownerToken}`).send({ name: "Updated Telecaller", phone: "9876500001" });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Telecaller");
  });

  it("should toggle user active status (disable)", async () => {
    const res = await request(app).patch(`/api/users/${createdUserId}/toggle-status`).set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it("should re-enable user (toggle again)", async () => {
    const res = await request(app).patch(`/api/users/${createdUserId}/toggle-status`).set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(true);
  });

  it("should reject duplicate email on create", async () => {
    const res = await request(app).post("/api/users").set("Authorization", `Bearer ${ownerToken}`).send({ name: "Duplicate User", email: "newtc.test@shanthiayurvedas.com", password: "Password@12345", role: ROLES.TELECALLER, branchId: branch._id.toString() });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("should filter users by role", async () => {
    const res = await request(app).get(`/api/users?role=${ROLES.TELECALLER}`).set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((u) => expect(u.role).toBe(ROLES.TELECALLER));
  });

  it("should admin reset user password via POST /:id/reset-password", async () => {
    // Route is POST not PATCH
    const res = await request(app).post(`/api/users/${createdUserId}/reset-password`).set("Authorization", `Bearer ${ownerToken}`).send({ password: "NewPassword@999" });
    expect(res.status).toBe(200);
    // Verify new password works
    const loginRes = await request(app).post("/api/auth/login").send({ email: "newtc.test@shanthiayurvedas.com", password: "NewPassword@999" });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeDefined();
  });
});
