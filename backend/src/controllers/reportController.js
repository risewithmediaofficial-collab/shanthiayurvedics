import { ReportService } from '../services/reportService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getSalesReport = asyncHandler(async (req, res) => {
  const branchId = req.branchScope.isGlobal ? req.query.branchId : req.branchScope.branchId;
  const { startDate, endDate, page, limit } = req.query;

  const result = await ReportService.getSalesReport({
    branchId,
    startDate,
    endDate,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 25
  });

  return ApiResponse.paginated(res, result.orders, result, 'Sales report retrieved', { summary: result.summary });
});

export const getLeadReport = asyncHandler(async (req, res) => {
  const branchId = req.branchScope.isGlobal ? req.query.branchId : req.branchScope.branchId;
  const { startDate, endDate } = req.query;

  const result = await ReportService.getLeadReport({
    branchId,
    startDate,
    endDate
  });

  return ApiResponse.success(res, result, 'Lead conversion report retrieved');
});

export const getDeliveryReport = asyncHandler(async (req, res) => {
  const branchId = req.branchScope.isGlobal ? req.query.branchId : req.branchScope.branchId;
  const result = await ReportService.getDeliveryReport({ branchId });
  return ApiResponse.success(res, result, 'Delivery analytics retrieved');
});
