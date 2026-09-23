import { FollowupService } from '../services/followupService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../constants/roles.js';

export const getFollowups = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const isExport = req.query.export === 'true';
  const limit = isExport ? 5000 : (parseInt(req.query.limit, 10) || 20);
  const category = req.query.category || req.query.filter || 'TODAY';

  const telecallerId = req.user.role === ROLES.TELECALLER ? req.user.id : req.query.telecallerId;
  const branchId = req.branchScope.isGlobal ? req.query.branchId : req.branchScope.branchId;

  const result = await FollowupService.getCategorizedFollowups({
    telecallerId,
    branchId,
    category,
    page: isExport ? 1 : page,
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

export const updateFollowup = asyncHandler(async (req, res) => {
  const { FollowUp } = await import('../models/FollowUp.js');
  const followup = await FollowUp.findById(req.params.id);
  if (!followup) {
    const { NotFoundError } = await import('../utils/errors.js');
    throw new NotFoundError('FollowUp');
  }

  const { scheduledAt, notes, priority } = req.body;
  if (scheduledAt) followup.scheduledAt = new Date(scheduledAt);
  if (notes !== undefined) followup.notes = notes;
  if (priority) followup.priority = priority;

  await followup.save();
  return ApiResponse.success(res, followup, 'Follow-up rescheduled/updated successfully');
});

export const deleteFollowup = asyncHandler(async (req, res) => {
  const { FollowUp } = await import('../models/FollowUp.js');
  const followup = await FollowUp.findById(req.params.id);
  if (!followup) {
    const { NotFoundError } = await import('../utils/errors.js');
    throw new NotFoundError('FollowUp');
  }

  await FollowUp.findByIdAndDelete(req.params.id);
  return ApiResponse.success(res, null, 'Follow-up removed successfully');
});
