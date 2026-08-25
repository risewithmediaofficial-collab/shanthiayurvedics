import mongoose from 'mongoose';
import { RTO_REASONS, RTO_CONDITION } from '../constants/shippingStates.js';

const rtoRecordSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true
    },
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
      index: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true
    },
    reason: {
      type: String,
      enum: Object.values(RTO_REASONS),
      required: true,
      index: true
    },
    returnAwbNumber: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['RTO_INITIATED', 'IN_TRANSIT', 'RECEIVED_AT_BRANCH', 'VERIFIED'],
      default: 'RTO_INITIATED',
      index: true
    },
    condition: {
      type: String,
      enum: Object.values(RTO_CONDITION),
      default: RTO_CONDITION.PENDING_VERIFICATION,
      index: true
    },
    receivedAt: {
      type: Date
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: {
      type: Date
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    restockedItems: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductBatch' },
        quantity: Number,
        condition: String // 'SALEABLE' or 'DAMAGED'
      }
    ],
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export const RTORecord = mongoose.model('RTORecord', rtoRecordSchema);
export default RTORecord;
