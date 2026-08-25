import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
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
    availableQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Available stock cannot be negative']
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Reserved stock cannot be negative']
    },
    allocatedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Allocated stock cannot be negative']
    },
    dispatchedQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    returnedQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    damagedQuantity: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

inventorySchema.index({ productId: 1, batchId: 1, branchId: 1 }, { unique: true });
inventorySchema.index({ branchId: 1, availableQuantity: 1 });

export const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;
