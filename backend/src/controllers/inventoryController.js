import { Inventory } from '../models/Inventory.js';
import { StockMovement } from '../models/StockMovement.js';
import { StockTransfer } from '../models/StockTransfer.js';
import { InventoryService } from '../services/inventoryService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getInventory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const isExport = req.query.export === 'true';
  const limit = isExport ? 5000 : parseInt(req.query.limit, 10) || 25;
  const search = req.query.search?.trim();
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const sortBy = req.query.sortBy || 'productName';
  const sortOrder = req.query.sortOrder === 'asc' || req.query.sortOrder === '1' ? 1 : -1;

  const query = {};
  if (!req.branchScope.isGlobal && req.branchScope.branchId) {
    query.branchId = req.branchScope.branchId;
  }

  if (startDate || endDate) {
    query.updatedAt = {};
    if (startDate) {
      query.updatedAt.$gte = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query.updatedAt.$lte = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`);
    }
  }

  const sortObj = {};
  if (sortBy === 'availableQuantity' || sortBy === 'stock' || sortBy === 'quantity') {
    sortObj.availableQuantity = sortOrder;
  } else if (sortBy === 'reservedQuantity') {
    sortObj.reservedQuantity = sortOrder;
  } else if (sortBy === 'updatedAt') {
    sortObj.updatedAt = sortOrder;
  } else if (sortBy === 'createdAt') {
    sortObj.createdAt = sortOrder;
  } else {
    sortObj['productId.name'] = sortOrder;
  }

  const skip = (page - 1) * limit;
  let findQuery = Inventory.find(query)
    .populate({
      path: 'productId',
      select: 'name sku category price mrp lowStockThreshold',
      match: search ? { $or: [{ name: { $regex: search, $options: 'i' } }, { sku: { $regex: search, $options: 'i' } }] } : {}
    })
    .populate('batchId', 'batchNumber expiryDate mrp')
    .populate('branchId', 'name code')
    .sort(sortObj);

  if (!isExport) {
    findQuery = findQuery.skip(skip).limit(limit);
  }

  const [total, rawInventory] = await Promise.all([
    Inventory.countDocuments(query),
    findQuery.lean()
  ]);

  // If search was applied to populated product, filter out records where product didn't match
  const inventory = search ? rawInventory.filter((item) => Boolean(item.productId)) : rawInventory;

  return ApiResponse.paginated(
    res,
    inventory,
    { page, limit: isExport ? inventory.length : limit, total: search ? inventory.length : total },
    'Inventory records retrieved'
  );
});

export const getStockMovements = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const isExport = req.query.export === 'true';
  const limit = isExport ? 5000 : parseInt(req.query.limit, 10) || 25;
  const productId = req.query.productId;
  const type = req.query.type;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' || req.query.sortOrder === '1' ? 1 : -1;

  const query = {};
  if (!req.branchScope.isGlobal && req.branchScope.branchId) {
    query.branchId = req.branchScope.branchId;
  }
  if (productId) query.productId = productId;
  if (type) query.type = type;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`);
    }
  }

  const sortObj = {};
  if (sortBy === 'quantity') sortObj.quantity = sortOrder;
  else if (sortBy === 'type') sortObj.type = sortOrder;
  else sortObj.createdAt = sortOrder;

  const skip = (page - 1) * limit;
  let findQuery = StockMovement.find(query)
    .populate('productId', 'name sku')
    .populate('batchId', 'batchNumber')
    .populate('branchId', 'name code')
    .populate('performedBy', 'name email')
    .sort(sortObj);

  if (!isExport) {
    findQuery = findQuery.skip(skip).limit(limit);
  }

  const [total, movements] = await Promise.all([
    StockMovement.countDocuments(query),
    findQuery.lean()
  ]);

  return ApiResponse.paginated(
    res,
    movements,
    { page, limit: isExport ? movements.length : limit, total },
    'Stock movements ledger retrieved'
  );
});

export const stockIn = asyncHandler(async (req, res) => {
  const branchId = req.body.branchId || (!req.branchScope?.isGlobal ? req.branchScope?.branchId : null);
  const result = await InventoryService.stockIn({
    productId: req.body.productId,
    batchId: req.body.batchId,
    branchId,
    quantity: Number(req.body.quantity),
    reason: req.body.reason,
    notes: req.body.notes,
    user: req.user,
    req
  });
  return ApiResponse.success(res, result, 'Stock In recorded successfully');
});

export const stockOut = asyncHandler(async (req, res) => {
  const branchId = req.body.branchId || (!req.branchScope?.isGlobal ? req.branchScope?.branchId : null);
  const result = await InventoryService.stockOut({
    productId: req.body.productId,
    batchId: req.body.batchId,
    branchId,
    quantity: Number(req.body.quantity),
    reason: req.body.reason,
    notes: req.body.notes,
    user: req.user,
    req
  });
  return ApiResponse.success(res, result, 'Stock Out recorded successfully');
});

export const adjustStock = asyncHandler(async (req, res) => {
  const branchId = req.body.branchId || (!req.branchScope?.isGlobal ? req.branchScope?.branchId : null);
  const result = await InventoryService.adjustStock({
    productId: req.body.productId,
    batchId: req.body.batchId,
    branchId,
    newAvailable: Number(req.body.newAvailable),
    reason: req.body.reason,
    notes: req.body.notes,
    user: req.user,
    req
  });
  return ApiResponse.success(res, result, 'Stock adjusted successfully');
});

export const getStockTransfers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const query = {};
  if (!req.branchScope.isGlobal && req.branchScope.branchId) {
    query.$or = [{ fromBranchId: req.branchScope.branchId }, { toBranchId: req.branchScope.branchId }];
  }

  const skip = (page - 1) * limit;
  const [total, transfers] = await Promise.all([
    StockTransfer.countDocuments(query),
    StockTransfer.find(query)
      .populate('fromBranchId', 'name code')
      .populate('toBranchId', 'name code')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('items.productId', 'name sku')
      .populate('items.batchId', 'batchNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return ApiResponse.paginated(res, transfers, { page, limit, total }, 'Stock transfers retrieved');
});

export const createStockTransfer = asyncHandler(async (req, res) => {
  const transfer = await InventoryService.createStockTransfer({
    fromBranchId: req.body.fromBranchId,
    toBranchId: req.body.toBranchId,
    items: req.body.items,
    notes: req.body.notes,
    user: req.user,
    req
  });
  return ApiResponse.created(res, transfer, 'Stock transfer requested successfully');
});

export const dispatchStockTransfer = asyncHandler(async (req, res) => {
  const transfer = await InventoryService.dispatchStockTransfer(
    req.params.id,
    req.body,
    req.user,
    req
  );
  return ApiResponse.success(res, transfer, 'Stock transfer dispatched');
});

export const receiveStockTransfer = asyncHandler(async (req, res) => {
  const transfer = await InventoryService.receiveStockTransfer(
    req.params.id,
    req.user,
    req
  );
  return ApiResponse.success(res, transfer, 'Stock transfer received and verified');
});

export const toggleStockStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive, isOutOfStockNote } = req.body;

  const inv = await Inventory.findById(id).populate('productId');
  if (!inv) {
    // If id might be a productId directly
    const product = await Product.findById(id);
    if (product) {
      product.isActive = isActive !== undefined ? Boolean(isActive) : !product.isActive;
      await product.save();
      await Inventory.updateMany({ productId: product._id }, { $set: { isActive: product.isActive, isOutOfStockNote: !product.isActive } });
      return ApiResponse.success(res, product, `Product stock marked as ${product.isActive ? 'Active' : 'Inactive'}`);
    }
    throw new NotFoundError('Inventory or Product record');
  }

  if (isActive !== undefined) {
    inv.isActive = Boolean(isActive);
  } else {
    inv.isActive = !inv.isActive;
  }

  if (isOutOfStockNote !== undefined) {
    inv.isOutOfStockNote = Boolean(isOutOfStockNote);
  } else {
    inv.isOutOfStockNote = !inv.isActive;
  }

  await inv.save();

  // Keep Product.isActive in sync
  if (inv.productId) {
    await Product.findByIdAndUpdate(inv.productId._id || inv.productId, {
      isActive: inv.isActive
    });
  }

  return ApiResponse.success(
    res,
    {
      _id: inv._id,
      productId: inv.productId?._id,
      isActive: inv.isActive,
      isOutOfStockNote: inv.isOutOfStockNote
    },
    `Stock item marked as ${inv.isActive ? 'Active' : 'Inactive (Out of Stock)'}`
  );
});
