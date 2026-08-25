import mongoose from 'mongoose';

const packingRecordSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true
    },
    packedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    packedAt: {
      type: Date,
      default: Date.now
    },
    packageDetails: {
      boxType: { type: String, default: 'Standard Corrugated Box' },
      itemsCount: { type: Number, required: true },
      sealNumber: { type: String }
    },
    weightGrams: {
      type: Number,
      required: [true, 'Package weight in grams is required'],
      min: 1
    },
    dimensions: {
      lengthCm: { type: Number, default: 20 },
      widthCm: { type: Number, default: 15 },
      heightCm: { type: Number, default: 10 }
    },
    packingStatus: {
      type: String,
      enum: ['IN_PROGRESS', 'PACKED', 'VERIFIED'],
      default: 'PACKED'
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

export const PackingRecord = mongoose.model('PackingRecord', packingRecordSchema);
export default PackingRecord;
