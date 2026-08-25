import mongoose from 'mongoose';
import { COURIER_PROVIDERS } from '../constants/shippingStates.js';

const shippingPartnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      enum: Object.values(COURIER_PROVIDERS),
      required: true,
      unique: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    apiEndpoint: {
      type: String,
      trim: true
    },
    apiKeyEncrypted: {
      type: String
    },
    accountNumber: {
      type: String
    },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

export const ShippingPartner = mongoose.model('ShippingPartner', shippingPartnerSchema);
export default ShippingPartner;
