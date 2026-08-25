import mongoose from 'mongoose';

const productBatchSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    batchNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true
    },
    manufacturingDate: {
      type: Date,
      required: true
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true
    },
    mrp: {
      type: Number,
      required: true,
      min: 0
    },
    purchasePrice: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

productBatchSchema.index({ productId: 1, batchNumber: 1 }, { unique: true });

export const ProductBatch = mongoose.model('ProductBatch', productBatchSchema);
export default ProductBatch;
