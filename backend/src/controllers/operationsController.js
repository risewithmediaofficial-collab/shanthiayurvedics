import { OperationsService } from '../services/operationsService.js';
import { PackingRecord } from '../models/PackingRecord.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getOperationsSummary = asyncHandler(async (req, res) => {
  const branchId = req.branchScope.isGlobal ? req.query.branchId : req.branchScope.branchId;
  const summary = await OperationsService.getOperationsSummary(branchId);
  return ApiResponse.success(res, summary, 'Operations summary retrieved');
});

export const packOrder = asyncHandler(async (req, res) => {
  const result = await OperationsService.packOrder(req.params.orderId, req.body, req.user, req);
  return ApiResponse.success(res, result, 'Order packed and packing record created');
});

export const getPackingRecords = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const query = {};
  if (!req.branchScope.isGlobal && req.branchScope.branchId) {
    query.branchId = req.branchScope.branchId;
  }

  const skip = (page - 1) * limit;
  const [total, records] = await Promise.all([
    PackingRecord.countDocuments(query),
    PackingRecord.find(query)
      .populate('orderId', 'orderNumber grandTotal status items')
      .populate('packedBy', 'name email')
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return ApiResponse.paginated(res, records, { page, limit, total }, 'Packing records retrieved');
});
