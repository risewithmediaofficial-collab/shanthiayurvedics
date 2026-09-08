import { Product } from '../models/Product.js';
import { ProductBatch } from '../models/ProductBatch.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { AuditService } from '../services/auditService.js';

export const getProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const search = req.query.search?.trim();
  const category = req.query.category;

  const query = { isActive: true };
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const [total, products] = await Promise.all([
    Product.countDocuments(query),
    Product.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean()
  ]);

  // Fetch active batches for these products
  const productIds = products.map((p) => p._id);
  const batches = await ProductBatch.find({ productId: { $in: productIds }, isActive: true }).lean();

  const productsWithBatches = products.map((p) => ({
    ...p,
    batches: batches.filter((b) => b.productId.toString() === p._id.toString())
  }));

  return ApiResponse.paginated(res, productsWithBatches, { page, limit, total }, 'Products retrieved');
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) throw new NotFoundError('Product');

  const batches = await ProductBatch.find({ productId: product._id }).sort({ expiryDate: 1 }).lean();

  return ApiResponse.success(res, { ...product, batches }, 'Product details retrieved');
});

export const createProduct = asyncHandler(async (req, res) => {
  const { name, sku, category, description, price, mrp, costPrice, unit, taxPercent, lowStockThreshold, initialBatch } = req.body;

  const existingSku = await Product.findOne({ sku: sku.toUpperCase().trim() });
  if (existingSku) {
    throw new ConflictError(`Product with SKU '${sku}' already exists`);
  }

  const product = new Product({
    name,
    sku: sku.toUpperCase().trim(),
    category,
    description,
    price,
    mrp,
    costPrice,
    unit,
    taxPercent,
    lowStockThreshold
  });
  await product.save();

  // Create initial batch if supplied
  if (initialBatch) {
    await ProductBatch.create({
      productId: product._id,
      batchNumber: initialBatch.batchNumber || `BAT-${Date.now().toString().slice(-4)}`,
      manufacturingDate: initialBatch.manufacturingDate || new Date(),
      expiryDate: initialBatch.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      mrp: initialBatch.mrp || mrp,
      purchasePrice: initialBatch.purchasePrice || costPrice
    });
  }

  await AuditService.log({
    userId: req.user.id,
    action: 'PRODUCT_CREATED',
    module: 'products',
    resourceType: 'Product',
    resourceId: product._id,
    newValue: product.toObject(),
    req
  });

  return ApiResponse.created(res, product, 'Product created successfully');
});

export const addBatch = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { batchNumber, manufacturingDate, expiryDate, mrp, purchasePrice } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw new NotFoundError('Product');

  const batch = new ProductBatch({
    productId: product._id,
    batchNumber: batchNumber.toUpperCase().trim(),
    manufacturingDate,
    expiryDate,
    mrp: mrp || product.mrp,
    purchasePrice: purchasePrice || product.costPrice
  });
  await batch.save();

  return ApiResponse.created(res, batch, 'Batch added successfully');
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new NotFoundError('Product');

  const oldValue = product.toObject();
  Object.assign(product, req.body);
  await product.save();

  await AuditService.log({
    userId: req.user.id,
    action: 'PRODUCT_UPDATED',
    module: 'products',
    resourceType: 'Product',
    resourceId: product._id,
    oldValue,
    newValue: product.toObject(),
    req
  });

  return ApiResponse.success(res, product, 'Product updated successfully');
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new NotFoundError('Product');

  product.isActive = false;
  await product.save();

  await AuditService.log({
    userId: req.user.id,
    action: 'PRODUCT_DELETED',
    module: 'products',
    resourceType: 'Product',
    resourceId: product._id,
    req
  });

  return ApiResponse.success(res, null, 'Product removed successfully');
});
