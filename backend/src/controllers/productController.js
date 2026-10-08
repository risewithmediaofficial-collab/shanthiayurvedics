import { Product } from '../models/Product.js';
import { ProductCategory } from '../models/ProductCategory.js';
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
  const { name, sku, category, description, price, mrp, costPrice, unit, taxPercent, lowStockThreshold, initialBatch, weight } = req.body;

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
    lowStockThreshold,
    weight: Number(weight) || 0
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

  // If category supplied, ensure it exists in ProductCategory
  if (category) {
    const trimmedCat = category.trim();
    const code = trimmedCat.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    ProductCategory.findOne({ $or: [{ code }, { name: { $regex: `^${trimmedCat}$`, $options: 'i' } }] })
      .then(async (found) => {
        if (!found) {
          await ProductCategory.create({
            name: trimmedCat,
            code,
            description: `Custom formulation category for ${trimmedCat}`,
            isSystem: false
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }

  return ApiResponse.created(res, product, 'Product created successfully');
});

export const addBatch = asyncHandler(async (req, res) => {
  const productId = req.params.productId || req.params.id;
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

  // If category changed, ensure it exists in ProductCategory
  if (req.body.category) {
    const trimmedCat = req.body.category.trim();
    const code = trimmedCat.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    ProductCategory.findOne({ $or: [{ code }, { name: { $regex: `^${trimmedCat}$`, $options: 'i' } }] })
      .then(async (found) => {
        if (!found) {
          await ProductCategory.create({
            name: trimmedCat,
            code,
            description: `Custom formulation category for ${trimmedCat}`,
            isSystem: false
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }

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

  // Also remove all stock inventory and batches for this deleted product
  await Inventory.deleteMany({ productId: product._id });
  await ProductBatch.deleteMany({ productId: product._id });

  await AuditService.log({
    userId: req.user.id,
    action: 'PRODUCT_DELETED',
    module: 'products',
    resourceType: 'Product',
    resourceId: product._id,
    req
  });

  return ApiResponse.success(res, null, 'Product and its stock removed successfully');
});

export const getCategories = asyncHandler(async (req, res) => {
  // If no categories in DB, seed standard defaults
  const count = await ProductCategory.countDocuments();
  if (count === 0) {
    const defaultCategories = [
      { code: 'OILS', name: 'Ayurvedic Oils', description: 'Classical and proprietary herbal oils / tailams', isSystem: true },
      { code: 'CHURNAS', name: 'Choornams / Powders', description: 'Micro-pulverized herb blends & churnas', isSystem: true },
      { code: 'CAPSULES', name: 'Capsules', description: 'Standardized herbal extracts in capsules', isSystem: true },
      { code: 'TONICS', name: 'Tonics / Syrups', description: 'Herbal asavas, arishtas & decoctions', isSystem: true },
      { code: 'TABLETS', name: 'Tablets / Vati', description: 'Ayurvedic tablets, gutika & vati', isSystem: true },
      { code: 'KITS', name: 'Treatment Kits', description: 'Combined ailment treatment protocols & kits', isSystem: true },
      { code: 'OTHER', name: 'Other Formulations', description: 'Balms, lehyams & miscellaneous formulations', isSystem: true }
    ];
    await ProductCategory.insertMany(defaultCategories).catch(() => {});
  }

  const categories = await ProductCategory.find().sort({ isSystem: -1, createdAt: 1 }).lean();

  // Aggregate product counts per category
  const productCounts = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);
  const countsMap = {};
  productCounts.forEach((c) => {
    if (c._id) {
      countsMap[String(c._id).toUpperCase()] = c.count;
    }
  });

  const enriched = categories.map((cat) => ({
    ...cat,
    productCount: countsMap[cat.code.toUpperCase()] || countsMap[cat.name.toUpperCase()] || 0
  }));

  return ApiResponse.success(res, enriched, 'Product categories retrieved');
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, code, description } = req.body;
  if (!name || !name.trim()) {
    return ApiResponse.error(res, 'Category name is required', 400);
  }

  const trimmedName = name.trim();
  const rawCode = code && code.trim() ? code.trim() : trimmedName.replace(/[^a-zA-Z0-9]/g, '_');
  const finalCode = rawCode.toUpperCase();

  const existing = await ProductCategory.findOne({
    $or: [
      { code: finalCode },
      { name: { $regex: `^${trimmedName}$`, $options: 'i' } }
    ]
  });

  if (existing) {
    return ApiResponse.conflict(res, `Category '${existing.name}' (${existing.code}) already exists`);
  }

  const newCategory = await ProductCategory.create({
    name: trimmedName,
    code: finalCode,
    description: description ? description.trim() : '',
    isSystem: false
  });

  await AuditService.log({
    userId: req.user.id,
    action: 'CATEGORY_CREATED',
    module: 'products',
    resourceType: 'ProductCategory',
    resourceId: newCategory._id,
    newValue: newCategory.toObject(),
    req
  });

  return ApiResponse.created(res, newCategory, 'Category created successfully');
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await ProductCategory.findById(id);
  if (!category) throw new NotFoundError('Category');

  if (category.isSystem) {
    return ApiResponse.error(res, 'System default categories cannot be deleted', 400);
  }

  const inUse = await Product.countDocuments({
    isActive: true,
    $or: [{ category: category.code }, { category: category.name }]
  });

  if (inUse > 0) {
    return ApiResponse.error(
      res,
      `Cannot delete category '${category.name}': ${inUse} active product(s) are currently assigned to it`,
      400
    );
  }

  await ProductCategory.findByIdAndDelete(id);

  await AuditService.log({
    userId: req.user.id,
    action: 'CATEGORY_DELETED',
    module: 'products',
    resourceType: 'ProductCategory',
    resourceId: category._id,
    req
  });

  return ApiResponse.success(res, null, 'Category deleted successfully');
});

