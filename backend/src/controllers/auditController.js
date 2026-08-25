import { AuditService } from '../services/auditService.js';
import { LoginHistory } from '../models/LoginHistory.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const module = req.query.module;
  const action = req.query.action;
  const userId = req.query.userId;
  const branchId = req.query.branchId;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  const result = await AuditService.query({
    page,
    limit,
    module,
    action,
    userId,
    branchId,
    startDate,
    endDate
  });

  return ApiResponse.paginated(res, result.logs, result, 'Audit logs retrieved');
});

export const getLoginHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const status = req.query.status;
  const email = req.query.email;

  const filter = {};
  if (status) filter.status = status;
  if (email) filter.email = { $regex: email, $options: 'i' };

  const skip = (page - 1) * limit;
  const [total, histories] = await Promise.all([
    LoginHistory.countDocuments(filter),
    LoginHistory.find(filter)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return ApiResponse.paginated(
    res,
    histories,
    { page, limit, total },
    'Login history retrieved'
  );
});
