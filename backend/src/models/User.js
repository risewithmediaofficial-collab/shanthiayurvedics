import mongoose from 'mongoose';
import argon2 from 'argon2';
import { ROLES } from '../constants/roles.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true
    },
    brand: {
      type: String,
      trim: true,
      default: 'Shanthi Ayurvedas'
    },
    assignedBrands: [
      {
        type: String,
        trim: true
      }
    ],
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: Object.values(ROLES),
      default: ROLES.TELECALLER,
      index: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true
    },
    branches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
      }
    ],
    phone: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    lockUntil: {
      type: Date,
      default: null
    },
    passwordChangedAt: {
      type: Date,
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    passwordResetToken: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true
  }
);

// Hash password with Argon2id
userSchema.statics.hashPassword = async function (plainPassword) {
  return argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1
  });
};

// Verify password with Argon2id
userSchema.methods.verifyPassword = async function (plainPassword) {
  if (!this.passwordHash) return false;
  return argon2.verify(this.passwordHash, plainPassword);
};

// Check if account is locked
userSchema.methods.isAccountLocked = function () {
  if (this.isLocked && this.lockUntil && this.lockUntil > new Date()) {
    return true;
  }
  return false;
};

// Handle failed login attempt
userSchema.methods.recordFailedLogin = async function () {
  this.failedLoginAttempts += 1;
  // Lock account after 5 failed attempts for 15 mins; 10 attempts for 1 hour
  if (this.failedLoginAttempts >= 10) {
    this.isLocked = true;
    this.lockUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  } else if (this.failedLoginAttempts >= 5) {
    this.isLocked = true;
    this.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
  }
  await this.save({ validateBeforeSave: false });
};

// Handle successful login
userSchema.methods.recordSuccessfulLogin = async function () {
  this.failedLoginAttempts = 0;
  this.isLocked = false;
  this.lockUntil = null;
  this.lastLoginAt = new Date();
  await this.save({ validateBeforeSave: false });
};

export const User = mongoose.model('User', userSchema);
export default User;
