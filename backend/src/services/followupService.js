import { FollowUp } from '../models/FollowUp.js';
import { NotFoundError } from '../utils/errors.js';
import { FOLLOWUP_STATUS } from '../constants/leadStates.js';
import { AuditService } from './auditService.js';

export class FollowupService {
  /**
   * List follow-ups categorized by today, overdue, upcoming
   */
  static async getCategorizedFollowups({ telecallerId, branchId, category, page = 1, limit = 20 }) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const baseFilter = {};
    if (telecallerId) baseFilter.telecallerId = telecallerId;
    if (branchId && branchId !== 'ALL') baseFilter.branchId = branchId;

    if (category === 'TODAY') {
      baseFilter.status = FOLLOWUP_STATUS.PENDING;
      baseFilter.scheduledAt = { $gte: startOfToday, $lte: endOfToday };
    } else if (category === 'OVERDUE') {
      baseFilter.status = FOLLOWUP_STATUS.PENDING;
      baseFilter.scheduledAt = { $lt: startOfToday };
    } else if (category === 'UPCOMING') {
      baseFilter.status = FOLLOWUP_STATUS.PENDING;
      baseFilter.scheduledAt = { $gt: endOfToday };
    } else if (category === 'COMPLETED') {
      baseFilter.status = FOLLOWUP_STATUS.COMPLETED;
    }

    const skip = (page - 1) * limit;
    const [total, followups, stats] = await Promise.all([
      FollowUp.countDocuments(baseFilter),
      FollowUp.find(baseFilter)
        .populate('leadId', 'name mobile source status city state')
        .populate('customerId', 'name mobile')
        .populate('telecallerId', 'name email')
        .populate('branchId', 'name code')
        .sort({ scheduledAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.getCounts({ telecallerId, branchId })
    ]);

    return {
      followups,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats
    };
  }

  /**
   * Get count breakdown for today, overdue, upcoming
   */
  static async getCounts({ telecallerId, branchId }) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const scopeFilter = {};
    if (telecallerId) scopeFilter.telecallerId = telecallerId;
    if (branchId && branchId !== 'ALL') scopeFilter.branchId = branchId;

    const [today, overdue, upcoming, completed] = await Promise.all([
      FollowUp.countDocuments({
        ...scopeFilter,
        status: FOLLOWUP_STATUS.PENDING,
        scheduledAt: { $gte: startOfToday, $lte: endOfToday }
      }),
      FollowUp.countDocuments({
        ...scopeFilter,
        status: FOLLOWUP_STATUS.PENDING,
        scheduledAt: { $lt: startOfToday }
      }),
      FollowUp.countDocuments({
        ...scopeFilter,
        status: FOLLOWUP_STATUS.PENDING,
        scheduledAt: { $gt: endOfToday }
      }),
      FollowUp.countDocuments({
        ...scopeFilter,
        status: FOLLOWUP_STATUS.COMPLETED
      })
    ]);

    return { today, overdue, upcoming, completed };
  }

  /**
   * Complete a follow-up
   */
  static async completeFollowup(followupId, completionNotes, user, req) {
    const followup = await FollowUp.findById(followupId);
    if (!followup) {
      throw new NotFoundError('FollowUp');
    }

    followup.status = FOLLOWUP_STATUS.COMPLETED;
    followup.completedAt = new Date();
    followup.completionNotes = completionNotes;
    await followup.save();

    await AuditService.log({
      userId: user.id,
      branchId: followup.branchId,
      action: 'FOLLOWUP_COMPLETED',
      module: 'followups',
      resourceType: 'FollowUp',
      resourceId: followup._id,
      newValue: { completionNotes, completedAt: followup.completedAt },
      req
    });

    return followup;
  }
}

export default FollowupService;
