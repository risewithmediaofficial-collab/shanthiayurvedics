import mongoose from 'mongoose';

const doctorSlotBookingSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true
    },
    date: {
      type: String, // format YYYY-MM-DD
      required: true,
      index: true
    },
    timeSlot: {
      type: String, // e.g. "09:30 AM" or "14:00"
      required: true
    },
    patientName: {
      type: String,
      required: true,
      trim: true
    },
    patientMobile: {
      type: String,
      required: true,
      trim: true
    },
    consultationType: {
      type: String,
      enum: ['TELEMEDICINE', 'WHATSAPP_VIDEO', 'IN_CLINIC'],
      default: 'TELEMEDICINE'
    },
    healthConcern: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
      default: 'CONFIRMED',
      index: true
    },
    notes: {
      type: String,
      trim: true
    },
    prescriptionOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

doctorSlotBookingSchema.index({ doctorId: 1, date: 1, timeSlot: 1 });

export const DoctorSlotBooking = mongoose.model('DoctorSlotBooking', doctorSlotBookingSchema);
export default DoctorSlotBooking;
