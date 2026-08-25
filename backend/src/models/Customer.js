import mongoose from 'mongoose';

const customerAddressSchema = new mongoose.Schema(
  {
    addressType: {
      type: String,
      enum: ['HOME', 'WORK', 'OTHER'],
      default: 'HOME'
    },
    street: {
      type: String,
      required: true,
      trim: true
    },
    landmark: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: true
    }
  },
  { _id: true }
);

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      index: true
    },
    fatherName: {
      type: String,
      trim: true
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true
    },
    altMobile: {
      type: String,
      trim: true
    },
    isAppRegistered: {
      type: Boolean,
      default: false
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true
    },
    whatsappNumber: {
      type: String,
      trim: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true
    },
    assignedTelecallerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    createdFromLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null
    },
    addresses: [customerAddressSchema],
    totalOrders: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'],
      default: 'ACTIVE'
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
customerSchema.index({ branchId: 1, createdAt: -1 });
customerSchema.index({ assignedTelecallerId: 1, createdAt: -1 });

export const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
