import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { Branch } from "../src/models/Branch.js";
import { Doctor } from "../src/models/Doctor.js";
import { ROLES } from "../src/constants/roles.js";
import "./setup.js";

describe("Doctor Slots & Booking Integration Tests", () => {
  let branch, managerToken, telecallerToken, doctorId;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const dayName = days[tomorrow.getDay()];

  beforeAll(async () => {
    branch = await Branch.findOne({ code: "HSR" });

    const manager = await User.create({ name: "Manager Slots", email: "manager.slots@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.MANAGER, branchId: branch._id, branches: [branch._id], isActive: true });
    const managerLogin = await request(app).post("/api/auth/login").send({ email: manager.email, password: "Password@12345" });
    managerToken = managerLogin.body.data.accessToken;

    const telecallerUser = await User.create({ name: "TC Slots", email: "tc.slots@shanthiayurvedas.com", passwordHash: await User.hashPassword("Password@12345"), role: ROLES.TELECALLER, branchId: branch._id, branches: [branch._id], isActive: true });
    const tcLogin = await request(app).post("/api/auth/login").send({ email: telecallerUser.email, password: "Password@12345" });
    telecallerToken = tcLogin.body.data.accessToken;

    const doctor = await Doctor.create({
      name: "Dr. Anbarasan BAMS",
      category: "AYURVEDIC_DOCTOR",
      qualification: "BAMS, MD",
      specialization: "Panchakarma Specialist",
      branchId: branch._id,
      phone: "9842199887",
      isActive: true,
      weeklySchedule: [
        { dayOfWeek: tomorrow.getDay(), dayName, isAvailable: true, startTime: "09:00", endTime: "18:00", slotDurationMinutes: 30 }
      ]
    });
    doctorId = doctor._id.toString();
  });

  it("should list doctors with available slots via GET /api/doctors/slots", async () => {
    const res = await request(app).get(`/api/doctors/slots?date=${tomorrowStr}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("doctors");
    expect(Array.isArray(res.body.data.doctors)).toBe(true);
    expect(res.body.data.doctors.length).toBeGreaterThan(0);
  });

  let bookingId;

  it("should book a consultation slot via POST /api/doctors/slots/book", async () => {
    const res = await request(app).post("/api/doctors/slots/book").set("Authorization", `Bearer ${telecallerToken}`).send({
      doctorId,
      date: tomorrowStr,
      timeSlot: "9:00 AM",
      patientName: "Murugan Patient",
      patientMobile: "9876500099",
      consultationType: "TELEMEDICINE",
      healthConcern: "Digestive and joint pain consultation"
    });
    expect(res.status).toBe(201);
    expect(res.body.data.doctorId).toBe(doctorId);
    expect(res.body.data.patientName).toBe("Murugan Patient");
    bookingId = res.body.data._id;
  });

  it("should update booking status via PATCH /api/doctors/slots/:id/status", async () => {
    if (!bookingId) return;
    const res = await request(app).patch(`/api/doctors/slots/${bookingId}/status`).set("Authorization", `Bearer ${managerToken}`).send({ status: "COMPLETED" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("COMPLETED");
  });

  it("should reject double booking the same slot on the same date (409 Conflict)", async () => {
    const res = await request(app).post("/api/doctors/slots/book").set("Authorization", `Bearer ${telecallerToken}`).send({
      doctorId,
      date: tomorrowStr,
      timeSlot: "9:00 AM",
      patientName: "Another Patient",
      patientMobile: "9876500088"
    });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});
