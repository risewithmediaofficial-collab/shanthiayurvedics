import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['OILS', 'CHURNAS', 'CAPSULES', 'TONICS', 'TABLETS', 'KITS', 'OTHER'],
      default: 'OILS',
      index: true
    },
    description: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: 0
    },
    mrp: {
      type: Number,
      required: [true, 'MRP is required'],
      min: 0
    },
    costPrice: {
      type: Number,
      default: 0,
      min: 0
    },
    unit: {
      type: String,
      default: 'Bottle'
    },
    taxPercent: {
      type: Number,
      default: 12
    },
    lowStockThreshold: {
      type: Number,
      default: 20
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Product = mongoose.model('Product', productSchema);
export default Product;
