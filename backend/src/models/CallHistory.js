import mongoose from 'mongoose';
import { CALL_STATUS } from '../constants/leadStates.js';

const callHistorySchema = new mongoose.Schema(
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
    callStatus: {
      type: String,
      enum: Object.values(CALL_STATUS),
      required: true,
      index: true
    },
    notes: {
      type: String,
      required: [true, 'Call notes are required'],
      trim: true
    },
    callDurationSeconds: {
      type: Number,
      default: 0
    },
    callStartedAt: {
      type: Date,
      default: Date.now
    },
    callEndedAt: {
      type: Date,
      default: Date.now
    },
    nextFollowUpAt: {
      type: Date,
      default: null
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM'
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for fast timeline queries
callHistorySchema.index({ leadId: 1, createdAt: -1 });
callHistorySchema.index({ customerId: 1, createdAt: -1 });
callHistorySchema.index({ telecallerId: 1, createdAt: -1 });

export const CallHistory = mongoose.model('CallHistory', callHistorySchema);
export default CallHistory;
