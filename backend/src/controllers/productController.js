import { Product } from '../models/Product.js';
import { ProductBatch } from '../models/ProductBatch.js';
import { Inventory } from '../models/Inventory.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { AuditService } from '../services/auditService.js';

export const getProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const isExport = req.query.export === 'true';
  const limit = isExport ? 5000 : (parseInt(req.query.limit, 10) || 20);
  const search = req.query.search?.trim();
  const category = req.query.category;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const sortBy = req.query.sortBy || 'name';
  const sortOrder = req.query.sortOrder === 'desc' || req.query.sortOrder === '-1' ? -1 : 1;

  const query = { isActive: true };
  if (category && category !== 'ALL') query.category = category;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`);
    }
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } }
    ];
  }

  const sortObj = {};
  if (sortBy === 'price') sortObj.price = sortOrder;
  else if (sortBy === 'mrp') sortObj.mrp = sortOrder;
  else if (sortBy === 'costPrice') sortObj.costPrice = sortOrder;
  else if (sortBy === 'sku') sortObj.sku = sortOrder;
  else if (sortBy === 'createdAt') sortObj.createdAt = sortOrder;
  else sortObj.name = sortOrder;

  const skip = isExport ? 0 : (page - 1) * limit;
  const [total, products] = await Promise.all([
    Product.countDocuments(query),
    Product.find(query).sort(sortObj).skip(skip).limit(limit).lean()
  ]);

  // Fetch active batches and inventory for these products
  const productIds = products.map((p) => p._id);
  const [batches, inventories] = await Promise.all([
    ProductBatch.find({ productId: { $in: productIds }, isActive: true }).lean(),
    Inventory.find({
      productId: { $in: productIds },
      ...(!req.branchScope?.isGlobal && req.branchScope?.branchId ? { branchId: req.branchScope.branchId } : {})
    }).lean()
  ]);

  const productsWithBatches = products.map((p) => {
    const pBatches = batches.filter((b) => b.productId.toString() === p._id.toString());
    const pInventories = inventories.filter((inv) => inv.productId.toString() === p._id.toString());
    const availableQuantity = pInventories.reduce((sum, inv) => sum + (inv.availableQuantity || 0), 0);
    const reservedQuantity = pInventories.reduce((sum, inv) => sum + (inv.reservedQuantity || 0), 0);

    return {
      ...p,
      batches: pBatches,
      availableQuantity,
      reservedQuantity,
      stock: availableQuantity,
      totalStock: availableQuantity
    };
  });

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
