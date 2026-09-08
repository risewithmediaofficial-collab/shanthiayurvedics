import { Doctor } from '../models/Doctor.js';
import { DoctorSlotBooking } from '../models/DoctorSlotBooking.js';
import { Branch } from '../models/Branch.js';
import { AuditService } from './auditService.js';
import { AppError, NotFoundError } from '../utils/errors.js';

export class DoctorSlotService {
  /**
   * Seed default doctors if none exist in the database
   */
  static async seedDefaultDoctorsIfNeeded() {
    const count = await Doctor.countDocuments();
    if (count > 0) return;

    const hosurBranch = await Branch.findOne({ code: 'HSR' });

    const defaultSchedule = [
      { dayOfWeek: 0, dayName: 'Sun', isAvailable: false, startTime: '09:00', endTime: '18:00', slotDurationMinutes: 30 },
      { dayOfWeek: 1, dayName: 'Mon', isAvailable: true, startTime: '09:00', endTime: '18:00', slotDurationMinutes: 30 },
      { dayOfWeek: 2, dayName: 'Tue', isAvailable: true, startTime: '09:00', endTime: '18:00', slotDurationMinutes: 30 },
      { dayOfWeek: 3, dayName: 'Wed', isAvailable: true, startTime: '09:00', endTime: '18:00', slotDurationMinutes: 30 },
      { dayOfWeek: 4, dayName: 'Thu', isAvailable: true, startTime: '09:00', endTime: '18:00', slotDurationMinutes: 30 },
      { dayOfWeek: 5, dayName: 'Fri', isAvailable: true, startTime: '09:00', endTime: '18:00', slotDurationMinutes: 30 },
      { dayOfWeek: 6, dayName: 'Sat', isAvailable: true, startTime: '09:00', endTime: '18:00', slotDurationMinutes: 30 }
    ];

    await Doctor.create([
      {
        name: 'Dr Shazia Sultana',
        category: 'AYURVEDIC_DOCTOR',
        specialization: 'General / Other',
        qualification: 'BAMS, MD (Ayu)',
        branchId: hosurBranch?._id,
        phone: '9842100112',
        status: 'AVAILABLE',
        weeklySchedule: defaultSchedule
      },
      {
        name: 'Dr Shanthi BAMS',
        category: 'AYURVEDIC_DOCTOR',
        specialization: 'Senior Vaidya & Chief Consultant',
        qualification: 'BAMS (Hosur Ayurvedic College)',
        branchId: hosurBranch?._id,
        phone: '9842111223',
        status: 'AVAILABLE',
        weeklySchedule: defaultSchedule
      },
      {
        name: 'Manjunath Mandya',
        category: 'PARAMPARA_VAIDYA',
        specialization: 'Traditional Nadi Pariksha & Spine Care',
        qualification: 'Hereditary Vaidya (3rd Gen)',
        branchId: hosurBranch?._id,
        phone: '9842133445',
        status: 'AVAILABLE',
        weeklySchedule: defaultSchedule
      },
      {
        name: 'Vaidya Raghavendra',
        category: 'PARAMPARA_VAIDYA',
        specialization: 'Herbal Detox & Panchakarma',
        qualification: 'Traditional Ayurvedic Healer',
        branchId: hosurBranch?._id,
        phone: '9842166778',
        status: 'AVAILABLE',
        weeklySchedule: defaultSchedule
      }
    ]);
  }

  /**
   * Helper: Generate time slots between start and end time (e.g. 09:00 to 18:00)
   */
  static generateSlots(startTime = '09:00', endTime = '18:00', durationMinutes = 30) {
    const slots = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + durationMinutes <= endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const displayM = m < 10 ? `0${m}` : m;
      slots.push(`${displayH}:${displayM} ${period}`);
      currentMinutes += durationMinutes;
    }

    return slots;
  }

  /**
   * Fetch all doctors with their schedule and bookings for a specific date.
   */
  static async getDoctorsWithSlots(dateStr) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const formattedDate = targetDate.toISOString().split('T')[0];
    const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon ...

    const [doctors, bookings] = await Promise.all([
      Doctor.find({ isActive: true }).populate('branchId', 'name code').lean(),
      DoctorSlotBooking.find({ date: formattedDate, status: { $ne: 'CANCELLED' } }).lean()
    ]);

    // Group bookings by doctor
    const bookingsByDoctor = {};
    for (const b of bookings) {
      if (!bookingsByDoctor[b.doctorId.toString()]) {
        bookingsByDoctor[b.doctorId.toString()] = [];
      }
      bookingsByDoctor[b.doctorId.toString()].push(b);
    }

    // Process doctors and enrich with slot availability
    const result = doctors.map((doc) => {
      const scheduleForDay = doc.weeklySchedule?.find((s) => s.dayOfWeek === dayOfWeek) || {
        isAvailable: true,
        startTime: '09:00',
        endTime: '18:00',
        slotDurationMinutes: 30
      };

      const isWorkingToday = scheduleForDay.isAvailable;
      const allSlots = isWorkingToday
        ? this.generateSlots(scheduleForDay.startTime, scheduleForDay.endTime, scheduleForDay.slotDurationMinutes)
        : [];

      const docBookings = bookingsByDoctor[doc._id.toString()] || [];
      const bookedSlotTimes = new Set(docBookings.map((b) => b.timeSlot));

      const slotDetails = allSlots.map((slotTime) => {
        const matchingBooking = docBookings.find((b) => b.timeSlot === slotTime);
        return {
          time: slotTime,
          isBooked: bookedSlotTimes.has(slotTime),
          booking: matchingBooking
            ? {
                patientName: matchingBooking.patientName,
                patientMobile: matchingBooking.patientMobile,
                consultationType: matchingBooking.consultationType,
                healthConcern: matchingBooking.healthConcern,
                status: matchingBooking.status
              }
            : null
        };
      });

      const totalSlots = allSlots.length;
      const bookedCount = docBookings.length;
      const availableCount = Math.max(0, totalSlots - bookedCount);

      let computedStatus = 'AVAILABLE';
      if (!isWorkingToday) computedStatus = 'NOT_AVAILABLE';
      else if (availableCount === 0 && totalSlots > 0) computedStatus = 'FULLY_BOOKED';

      return {
        ...doc,
        selectedDate: formattedDate,
        dayOfWeek,
        isWorkingToday,
        workingHours: `${scheduleForDay.startTime} - ${scheduleForDay.endTime}`,
        totalSlots,
        bookedCount,
        availableCount,
        computedStatus,
        slots: slotDetails,
        bookings: docBookings
      };
    });

    return {
      date: formattedDate,
      dayOfWeek,
      doctors: result
    };
  }

  /**
   * Book a slot for a doctor
   */
  static async bookSlot(data, user, req) {
    const {
      doctorId,
      date,
      timeSlot,
      patientName,
      patientMobile,
      consultationType = 'TELEMEDICINE',
      healthConcern,
      notes,
      branchId
    } = data;

    if (!doctorId || !date || !timeSlot || !patientName || !patientMobile) {
      throw new AppError('Doctor, date, timeSlot, patientName, and patientMobile are required', 400);
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new NotFoundError('Doctor');
    }

    // Check if slot is already booked
    const existing = await DoctorSlotBooking.findOne({
      doctorId,
      date,
      timeSlot,
      status: { $ne: 'CANCELLED' }
    });

    if (existing) {
      throw new AppError(`Slot ${timeSlot} on ${date} is already booked by another patient`, 409);
    }

    const booking = await DoctorSlotBooking.create({
      doctorId,
      branchId: branchId || doctor.branchId,
      date,
      timeSlot,
      patientName: patientName.trim(),
      patientMobile: patientMobile.trim(),
      consultationType,
      healthConcern: healthConcern?.trim(),
      notes: notes?.trim(),
      status: 'CONFIRMED',
      bookedBy: user?._id || user?.id
    });

    if (user) {
      await AuditService.log({
        userId: user._id || user.id,
        branchId: booking.branchId,
        action: 'DOCTOR_SLOT_BOOKED',
        module: 'consultations',
        resourceType: 'DoctorSlotBooking',
        resourceId: booking._id,
        newValue: { doctorName: doctor.name, patientName, date, timeSlot },
        req
      });
    }

    return booking;
  }

  /**
   * Update status of a booking (e.g. COMPLETED or CANCELLED)
   */
  static async updateBookingStatus(bookingId, status, user, req) {
    const booking = await DoctorSlotBooking.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('DoctorSlotBooking');
    }

    booking.status = status;
    await booking.save();

    if (user) {
      await AuditService.log({
        userId: user._id || user.id,
        branchId: booking.branchId,
        action: 'DOCTOR_SLOT_STATUS_UPDATED',
        module: 'consultations',
        resourceType: 'DoctorSlotBooking',
        resourceId: booking._id,
        newValue: { status },
        req
      });
    }

    return booking;
  }
}

export default DoctorSlotService;
