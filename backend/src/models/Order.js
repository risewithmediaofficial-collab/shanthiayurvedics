import mongoose from 'mongoose';
import { ORDER_STATUS } from '../constants/orderStates.js';

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductBatch',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
});

const orderStatusHistoryItemSchema = new mongoose.Schema({
  fromStatus: String,
  toStatus: String,
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  notes: String
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true
    },
    telecallerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    discountTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    shippingCharge: {
      type: Number,
      default: 0,
      min: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.NEW,
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ['COD', 'ONLINE', 'BANK_TRANSFER', 'UPI'],
      default: 'COD'
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'COD_PENDING', 'FAILED', 'REFUNDED'],
      default: 'COD_PENDING',
      index: true
    },
    patientDetails: {
      patientName: { type: String, trim: true },
      fatherName: { type: String, trim: true },
      mobile: { type: String, trim: true },
      alternateMobile: { type: String, trim: true }
    },
    patientAppRegistered: {
      type: Boolean,
      default: false
    },
    offerPrice: {
      type: Number
    },
    deliveryAddress: {
      street: { type: String, required: true },
      landmark: { type: String },
      village: { type: String },
      taluk: { type: String },
      district: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      phone: { type: String },
      alternatePhone: { type: String }
    },
    notes: {
      type: String,
      trim: true
    },
    cancellationReason: {
      type: String,
      trim: true
    },
    trackingNumber: {
      type: String,
      trim: true,
      index: true
    },
    courierName: {
      type: String,
      default: 'India Post'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: {
      type: Date
    },
    assignedVerifierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    statusHistory: [orderStatusHistoryItemSchema]
  },
  {
    timestamps: true
  }
);

orderSchema.index({ branchId: 1, status: 1 });
orderSchema.index({ telecallerId: 1, createdAt: -1 });
orderSchema.index({ branchId: 1, createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
export default Order;
