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
    }
  },
  {
    timestamps: true
  }
);

export const Shipment = mongoose.model('Shipment', shipmentSchema);
export default Shipment;
