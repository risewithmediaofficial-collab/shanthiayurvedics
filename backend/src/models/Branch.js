import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true,
      unique: true
    },
    code: {
      type: String,
      required: [true, 'Branch code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      country: { type: String, default: 'India' }
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
    branchType: {
      type: String,
      enum: ['COMPANY_OWNED', 'FRANCHISE'],
      default: 'COMPANY_OWNED'
    },
    billerId: {
      type: String,
      default: '1000058077',
      trim: true
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    managerName: {
      type: String,
      trim: true
    },
    managerPhone: {
      type: String,
      trim: true
    },
    revenueSharePercent: {
      type: Number,
      default: 0
    },
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

export const Branch = mongoose.model('Branch', branchSchema);
export default Branch;
