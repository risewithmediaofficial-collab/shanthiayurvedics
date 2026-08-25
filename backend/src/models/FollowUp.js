import mongoose from 'mongoose';
import { FOLLOWUP_STATUS } from '../constants/leadStates.js';

const followUpSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true
    },
    telecallerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled date and time are required'],
      index: true
    },
    status: {
      type: String,
      enum: Object.values(FOLLOWUP_STATUS),
      default: FOLLOWUP_STATUS.PENDING,
      index: true
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
      index: true
    },
    notes: {
      type: String,
      trim: true
    },
    completedAt: {
      type: Date,
      default: null
    },
    completionNotes: {
      type: String,
      trim: true
    },
    isNotificationSent: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for today/overdue/upcoming filtering
followUpSchema.index({ telecallerId: 1, status: 1, scheduledAt: 1 });
followUpSchema.index({ branchId: 1, status: 1, scheduledAt: 1 });

export const FollowUp = mongoose.model('FollowUp', followUpSchema);
export default FollowUp;
