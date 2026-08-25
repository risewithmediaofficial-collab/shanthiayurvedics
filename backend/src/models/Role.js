import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.js';

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    permissions: [
      {
        type: String,
        trim: true
      }
    ],
    isSystemRole: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export const Role = mongoose.model('Role', roleSchema);
export default Role;
