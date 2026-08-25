import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    refreshTokenHash: {
      type: String,
      required: true,
      index: true
    },
    userAgent: {
      type: String,
      default: 'Unknown'
    },
    ipAddress: {
      type: String,
      default: 'Unknown'
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index automatically clears expired sessions
    },
    isValid: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Session = mongoose.model('Session', sessionSchema);
export default Session;
