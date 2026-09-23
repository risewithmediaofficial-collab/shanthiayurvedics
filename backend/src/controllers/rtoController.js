import { RTOService } from '../services/rtoService.js';
import { RTORecord } from '../models/RTORecord.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getRTORecords = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const isExport = req.query.export === 'true';
  const limit = isExport ? 5000 : (parseInt(req.query.limit, 10) || 20);
  const status = req.query.status;
  const condition = req.query.condition;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const search = req.query.search?.trim();

  const query = {};
  if (!req.branchScope.isGlobal && req.branchScope.branchId) {
    query.branchId = req.branchScope.branchId;
  }
  if (status) query.status = status;
  if (condition) query.condition = condition;

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
      { returnAwbNumber: { $regex: search, $options: 'i' } },
      { reason: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = isExport ? 0 : (page - 1) * limit;
  const [total, records] = await Promise.all([
    RTORecord.countDocuments(query),
    RTORecord.find(query)
      .populate('orderId', 'orderNumber grandTotal deliveryAddress customerId items')
      .populate('shipmentId', 'awbNumber courierName')
      .populate('branchId', 'name code')
      .populate('receivedBy', 'name email')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return ApiResponse.paginated(res, records, { page, limit, total }, 'RTO records retrieved');
});

export const initiateRTO = asyncHandler(async (req, res) => {
  const rto = await RTOService.initiateRTO(req.body, req.user, req);
  return ApiResponse.created(res, rto, 'RTO initiated successfully');
});

export const markRTOReceived = asyncHandler(async (req, res) => {
  const rto = await RTOService.markRTOReceived(req.params.id, req.user, req);
  return ApiResponse.success(res, rto, 'RTO package marked as received at branch');
});

export const verifyAndRecover = asyncHandler(async (req, res) => {
  const rto = await RTOService.verifyAndRecoverStock(req.params.id, req.body, req.user, req);
  return ApiResponse.success(res, rto, 'RTO condition verified and inventory recovery completed');
});
