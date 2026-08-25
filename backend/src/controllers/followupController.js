import { FollowupService } from '../services/followupService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../constants/roles.js';

export const getFollowups = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const category = req.query.category || 'TODAY';

  const telecallerId = req.user.role === ROLES.TELECALLER ? req.user.id : req.query.telecallerId;
  const branchId = req.branchScope.isGlobal ? req.query.branchId : req.branchScope.branchId;

  const result = await FollowupService.getCategorizedFollowups({
    telecallerId,
    branchId,
    category,
    page,
    limit
  });

  return ApiResponse.paginated(
    res,
    result.followups,
    { page, limit, total: result.total },
    'Follow-ups retrieved',
    { stats: result.stats }
  );
});

export const completeFollowup = asyncHandler(async (req, res) => {
  const { completionNotes } = req.body;
  const followup = await FollowupService.completeFollowup(
    req.params.id,
    completionNotes,
    req.user,
    req
  );
  return ApiResponse.success(res, followup, 'Follow-up marked as completed');
});
