import mongoose from 'mongoose';
import { SHIPPING_STATUS } from '../constants/shippingStates.js';

const trackingEventSchema = new mongoose.Schema(
  {
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
      required: true,
      index: true
    },
    awbNumber: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(SHIPPING_STATUS),
      required: true,
      index: true
    },
    location: {
      type: String,
      default: 'Hub'
    },
    activity: {
      type: String,
      required: true
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

export const TrackingEvent = mongoose.model('TrackingEvent', trackingEventSchema);
export default TrackingEvent;
