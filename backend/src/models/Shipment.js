import mongoose from 'mongoose';
import { SHIPPING_STATUS } from '../constants/shippingStates.js';

const shipmentSchema = new mongoose.Schema(
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
    shippingPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShippingPartner'
    },
    courierName: {
      type: String,
      required: true,
      default: 'India Post'
    },
    awbNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    shippingCharge: {
      type: Number,
      default: 0
    },
    bookingDate: {
      type: Date,
      default: Date.now
    },
    dispatchedDate: {
      type: Date
    },
    expectedDeliveryDate: {
      type: Date
    },
    actualDeliveryDate: {
      type: Date
    },
    trackingStatus: {
      type: String,
      enum: Object.values(SHIPPING_STATUS),
      default: SHIPPING_STATUS.SHIPMENT_CREATED,
      index: true
    },
    carrierCode: {
      type: String,
      default: 'INDIA_POST',
      index: true
    },
    isMock: {
      type: Boolean,
      default: false
    },
    labelUrl: {
      type: String
    },
    packageDetails: {
      weight: { type: Number, default: 0.5 },
      pieces: { type: Number, default: 1 },
      length: { type: Number, default: 10 },
      width: { type: Number, default: 10 },
      height: { type: Number, default: 10 }
    },
    tpcDetails: {
      refNo: { type: String },
      podNo: { type: String },
      cnoteNo: { type: String },
      transMode: { type: String, default: 'ST' },
      serviceType: { type: String, default: 'STD' },
      rawResponse: { type: mongoose.Schema.Types.Mixed }
    },
    cancellation: {
      isCancelled: { type: Boolean, default: false },
      cancelledAt: { type: Date },
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: { type: String }
    }
  },
  {
    timestamps: true
  }
);

export const Shipment = mongoose.model('Shipment', shipmentSchema);
export default Shipment;
