import mongoose from 'mongoose';

const productCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Category code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    isSystem: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export const ProductCategory = mongoose.model('ProductCategory', productCategorySchema);
export default ProductCategory;
