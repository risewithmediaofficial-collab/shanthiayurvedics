import { Inventory } from '../models/Inventory.js';
import { StockMovement } from '../models/StockMovement.js';
import { StockTransfer } from '../models/StockTransfer.js';
import { InventoryService } from '../services/inventoryService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getInventory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const search = req.query.search?.trim();

  const query = {};
  if (!req.branchScope.isGlobal && req.branchScope.branchId) {
    query.branchId = req.branchScope.branchId;
  }

  const skip = (page - 1) * limit;
  const [total, inventory] = await Promise.all([
    Inventory.countDocuments(query),
    Inventory.find(query)
      .populate('productId', 'name sku category price mrp lowStockThreshold')
      .populate('batchId', 'batchNumber expiryDate mrp')
      .populate('branchId', 'name code')
      .sort({ 'productId.name': 1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return ApiResponse.paginated(res, inventory, { page, limit, total }, 'Inventory records retrieved');
});

export const getStockMovements = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const productId = req.query.productId;
  const type = req.query.type;

  const query = {};
  if (!req.branchScope.isGlobal && req.branchScope.branchId) {
    query.branchId = req.branchScope.branchId;
  }
  if (productId) query.productId = productId;
  if (type) query.type = type;

  const skip = (page - 1) * limit;
  const [total, movements] = await Promise.all([
    StockMovement.countDocuments(query),
    StockMovement.find(query)
      .populate('productId', 'name sku')
      .populate('batchId', 'batchNumber')
      .populate('branchId', 'name code')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return ApiResponse.paginated(res, movements, { page, limit, total }, 'Stock movements ledger retrieved');
});

export const stockIn = asyncHandler(async (req, res) => {
  const branchId = req.body.branchId || req.branchScope.branchId;
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
  const branchId = req.body.branchId || req.branchScope.branchId;
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
  const branchId = req.body.branchId || req.branchScope.branchId;
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
