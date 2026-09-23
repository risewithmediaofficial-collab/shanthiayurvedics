import { DashboardService } from '../services/dashboardService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../constants/roles.js';

export const getDashboardData = asyncHandler(async (req, res) => {
  const branchId = req.branchScope.isGlobal ? (req.query.branchId || 'ALL') : req.branchScope.branchId;

  if (req.user.role === ROLES.OWNER) {
    const data = await DashboardService.getOwnerDashboard(branchId);
    return ApiResponse.success(res, data, 'Owner master dashboard retrieved');
  }

  if (req.user.role === ROLES.DISTRIBUTOR) {
    const data = await DashboardService.getDistributorDashboard(branchId, req.user.id);
    return ApiResponse.success(res, data, 'Distributor branch stock dashboard retrieved');
  }

  if (req.user.role === ROLES.MANAGER) {
    const data = await DashboardService.getManagerDashboard(branchId);
    return ApiResponse.success(res, data, 'Manager dashboard retrieved');
  }

  if (req.user.role === ROLES.TELECALLER) {
    const data = await DashboardService.getTelecallerDashboard(req.user.id, branchId);
    return ApiResponse.success(res, data, 'Telecaller dashboard retrieved');
  }

  const fallback = await DashboardService.getOwnerDashboard(branchId);
  return ApiResponse.success(res, fallback, 'Dashboard retrieved');
});
