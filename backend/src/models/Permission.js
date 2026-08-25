import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Permission code is required'],
      unique: true,
      trim: true
    },
    module: {
      type: String,
      required: [true, 'Module name is required'],
      trim: true,
      index: true
    },
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export const Permission = mongoose.model('Permission', permissionSchema);
export default Permission;
