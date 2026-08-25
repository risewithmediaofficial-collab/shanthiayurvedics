import mongoose from 'mongoose';

const weeklyScheduleSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number, // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
      required: true,
      min: 0,
      max: 6
    },
    dayName: {
      type: String,
      enum: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    startTime: {
      type: String,
      default: '09:00'
    },
    endTime: {
      type: String,
      default: '18:00'
    },
    slotDurationMinutes: {
      type: Number,
      default: 30
    },
    maxBookingsPerSlot: {
      type: Number,
      default: 1
    }
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true
    },
    category: {
      type: String,
      enum: ['AYURVEDIC_DOCTOR', 'PARAMPARA_VAIDYA', 'SPECIALIST'],
      default: 'AYURVEDIC_DOCTOR',
      index: true
    },
    specialization: {
      type: String,
      default: 'General / Other',
      trim: true
    },
    qualification: {
      type: String,
      default: 'BAMS, MD (Ayurveda)',
      trim: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    consultationFee: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'FULLY_BOOKED', 'NOT_AVAILABLE', 'ON_LEAVE'],
      default: 'AVAILABLE',
      index: true
    },
    weeklySchedule: [weeklyScheduleSchema],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;
