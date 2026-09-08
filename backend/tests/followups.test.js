import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { Branch } from "../src/models/Branch.js";
import { Lead } from "../src/models/Lead.js";
import { FollowUp } from "../src/models/FollowUp.js";
import { ROLES } from "../src/constants/roles.js";
import "./setup.js";

describe("Follow-ups Module Integration Tests", () => {
  let branch, telecallerToken, telecallerUser, leadId;

  beforeAll(async () => {
    branch = await Branch.findOne({ code: "HSR" });

    telecallerUser = await User.create({ name: "TC Followup", email: "tc.followup@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.TELECALLER, branchId: branch._id, branches: [branch._id], isActive: true });
    const tcLogin = await request(app).post("/api/auth/login").send({ email: telecallerUser.email, password: "Password@12345" });
    telecallerToken = tcLogin.body.data.accessToken;

    const lead = await Lead.create({ name: "Followup Lead", mobile: "9000000001", source: "CALL", branchId: branch._id, assignedTo: telecallerUser._id });
    leadId = lead._id.toString();
  });

  let followupId;

  it("should create a follow-up task by logging a call via POST /api/leads/:id/calls", async () => {
    const callbackDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app).post(`/api/leads/${leadId}/calls`).set("Authorization", `Bearer ${telecallerToken}`).send({
      outcome: "INTERESTED",
      notes: "Customer asked for callback tomorrow",
      nextFollowUpAt: callbackDate
    });
    expect([200, 201]).toContain(res.status);

    // Verify follow-up task created in DB
    const createdFollowup = await FollowUp.findOne({ leadId });
    expect(createdFollowup).toBeDefined();
    expect(createdFollowup).not.toBeNull();
    followupId = createdFollowup._id.toString();
  });

  it("should list follow-ups for telecaller (TODAY category)", async () => {
    const res = await request(app).get("/api/followups?category=TODAY").set("Authorization", `Bearer ${telecallerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should list UPCOMING follow-ups", async () => {
    const res = await request(app).get("/api/followups?category=UPCOMING").set("Authorization", `Bearer ${telecallerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should list OVERDUE follow-ups", async () => {
    const res = await request(app).get("/api/followups?category=OVERDUE").set("Authorization", `Bearer ${telecallerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should complete a follow-up via PATCH /api/followups/:id/complete", async () => {
    expect(followupId).toBeDefined();
    const res = await request(app).patch(`/api/followups/${followupId}/complete`).set("Authorization", `Bearer ${telecallerToken}`).send({ completionNotes: "Called back customer, they confirmed interest." });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("COMPLETED");
  });

  it("should return paginated follow-up data with pagination key", async () => {
    const res = await request(app).get("/api/followups?category=UPCOMING").set("Authorization", `Bearer ${telecallerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.pagination).toBeDefined();
  });
});
