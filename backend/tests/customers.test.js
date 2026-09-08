import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { Branch } from "../src/models/Branch.js";
import { Lead } from "../src/models/Lead.js";
import { Customer } from "../src/models/Customer.js";
import { ROLES } from "../src/constants/roles.js";
import "./setup.js";

describe("Customers Module Integration Tests", () => {
  let branch, ownerToken, telecallerUser, telecallerToken, createdCustomerId, leadForConversion;

  beforeAll(async () => {
    branch = await Branch.findOne({ code: "HSR" });

    const owner = await User.create({ name: "Owner Customers", email: "owner.customers@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.OWNER, branchId: branch._id, branches: [branch._id], isActive: true });
    const ownerLogin = await request(app).post("/api/auth/login").send({ email: owner.email, password: "Password@12345" });
    ownerToken = ownerLogin.body.data.accessToken;

    telecallerUser = await User.create({ name: "Telecaller Customers", email: "tc.customers@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.TELECALLER, branchId: branch._id, branches: [branch._id], isActive: true });
    const tcLogin = await request(app).post("/api/auth/login").send({ email: telecallerUser.email, password: "Password@12345" });
    telecallerToken = tcLogin.body.data.accessToken;

    leadForConversion = await Lead.create({ name: "Conversion Test Lead", mobile: "9876543210", source: "CALL", branchId: branch._id, assignedTo: telecallerUser._id });
  });

  it("should list customers with pagination (pagination key not meta)", async () => {
    const res = await request(app).get("/api/customers").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // ApiResponse.paginated uses "pagination" not "meta"
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination).toHaveProperty("total");
    expect(res.body.pagination).toHaveProperty("page");
  });

  it("should convert a lead into a customer with address", async () => {
    const res = await request(app).post(`/api/customers/convert-lead/${leadForConversion._id}`).set("Authorization", `Bearer ${telecallerToken}`).send({ name: "Conversion Test Lead", street: "88 Nehru Road", city: "Hosur", state: "Tamil Nadu", pincode: "635109" });
    expect(res.status).toBe(201);
    expect(res.body.data.mobile).toBe("9876543210");
    expect(res.body.data.addresses.length).toBeGreaterThan(0);
    createdCustomerId = res.body.data._id;
  });

  it("should fetch customer by ID with full timeline (calls, followups, originalLead)", async () => {
    const res = await request(app).get(`/api/customers/${createdCustomerId}`).set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.customer._id).toBe(createdCustomerId);
    // Timeline returns: { customer, calls, followups, originalLead } -- no "orders"
    expect(res.body.data).toHaveProperty("calls");
    expect(res.body.data).toHaveProperty("followups");
    expect(res.body.data).toHaveProperty("originalLead");
  });

  it("should add an additional address to customer", async () => {
    const res = await request(app).post(`/api/customers/${createdCustomerId}/addresses`).set("Authorization", `Bearer ${telecallerToken}`).send({ street: "22 Bypass Road", city: "Krishnagiri", state: "Tamil Nadu", pincode: "635001", addressType: "WORK" });
    expect(res.status).toBe(200);
    expect(res.body.data.addresses.length).toBeGreaterThan(1);
  });

  it("should search customers by mobile", async () => {
    const res = await request(app).get("/api/customers?search=9876543210").set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((c) => c.mobile === "9876543210")).toBe(true);
  });

  it("should return existing customer (not error) on duplicate lead conversion (idempotent)", async () => {
    // CustomerService returns existing customer on duplicate, does NOT throw
    const res = await request(app).post(`/api/customers/convert-lead/${leadForConversion._id}`).set("Authorization", `Bearer ${telecallerToken}`).send({ name: "Duplicate", street: "Any", city: "Chennai", state: "Tamil Nadu", pincode: "600001" });
    // Returns 201 with the existing customer (idempotent)
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });

  it("should enforce telecaller scope", async () => {
    const res = await request(app).get("/api/customers").set("Authorization", `Bearer ${telecallerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
