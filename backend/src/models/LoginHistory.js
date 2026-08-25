import mongoose from 'mongoose';

const loginHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true
    },
    ipAddress: {
      type: String,
      default: 'Unknown'
    },
    userAgent: {
      type: String,
      default: 'Unknown'
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'LOCKED', 'LOGOUT'],
      required: true,
      index: true
    },
    failureReason: {
      type: String,
      default: null
    },
    loginAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    logoutAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index for querying user history over time
loginHistorySchema.index({ userId: 1, createdAt: -1 });

export const LoginHistory = mongoose.model('LoginHistory', loginHistorySchema);
export default LoginHistory;
