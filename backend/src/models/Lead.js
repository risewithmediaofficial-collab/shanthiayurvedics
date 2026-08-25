import mongoose from 'mongoose';
import { LEAD_SOURCES, LEAD_STATUS } from '../constants/leadStates.js';

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
      index: true
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
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true
    },
    whatsappNumber: {
      type: String,
      trim: true,
      index: true
    },
    source: {
      type: String,
      enum: Object.values(LEAD_SOURCES),
      default: LEAD_SOURCES.MANUAL,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(LEAD_STATUS),
      default: LEAD_STATUS.NEW,
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch ID is required'],
      index: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    },
    interestedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      }
    ],
    notes: {
      type: String,
      trim: true
    },
    isDuplicate: {
      type: Boolean,
      default: false,
      index: true
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null
    },
    convertedCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null
    },
    lastContactedAt: {
      type: Date,
      default: null
    },
    nextFollowUpAt: {
      type: Date,
      default: null,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for optimized queries
leadSchema.index({ branchId: 1, status: 1 });
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ assignedTo: 1, nextFollowUpAt: 1 });
leadSchema.index({ branchId: 1, createdAt: -1 });

export const Lead = mongoose.model('Lead', leadSchema);
export default Lead;
