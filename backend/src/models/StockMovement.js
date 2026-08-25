import mongoose from 'mongoose';
import { MOVEMENT_TYPES, MOVEMENT_REASONS } from '../constants/stockStates.js';

const stockMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductBatch',
      required: true,
      index: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(MOVEMENT_TYPES),
      required: true,
      index: true
    },
    quantity: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      enum: Object.values(MOVEMENT_REASONS),
      required: true,
      index: true
    },
    referenceType: {
      type: String, // 'Order', 'StockTransfer', 'StockAdjustment', 'RTORecord', 'Purchase'
      index: true
    },
    referenceId: {
      type: String,
      index: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    previousAvailable: {
      type: Number,
      required: true
    },
    newAvailable: {
      type: Number,
      required: true
    },
    notes: {
      type: String,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

stockMovementSchema.index({ branchId: 1, productId: 1, createdAt: -1 });

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
export default StockMovement;
