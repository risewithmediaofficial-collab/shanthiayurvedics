import { assertRecordAccess } from '../utils/recordScope.js';
import { FollowUp } from '../models/FollowUp.js';
import { NotFoundError } from '../utils/errors.js';
import { FOLLOWUP_STATUS } from '../constants/leadStates.js';
import { AuditService } from './auditService.js';
import { businessDateBoundaries } from '../utils/businessTime.js';
import { emitToBranch, emitToUser } from '../sockets/index.js';

export class FollowupService {
  /**
   * List follow-ups categorized by today, overdue, upcoming
   */
  static async getCategorizedFollowups({ telecallerId, branchId, category, page = 1, limit = 20 }) {
    await this.cleanupOrphanedFollowups();
    const { startOfToday, endOfToday } = businessDateBoundaries();

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
   * Automatically purge orphaned follow-ups whose referenced lead/customer no longer exists
   */
  static async cleanupOrphanedFollowups() {
    try {
      const { Lead } = await import('../models/Lead.js');
      const { Customer } = await import('../models/Customer.js');

      const pendingFollowups = await FollowUp.find({ status: FOLLOWUP_STATUS.PENDING })
        .select('_id leadId customerId')
        .lean();

      if (!pendingFollowups || pendingFollowups.length === 0) return;

      const leadIds = pendingFollowups.map((f) => f.leadId).filter(Boolean);
      const customerIds = pendingFollowups.map((f) => f.customerId).filter(Boolean);

      const [existingLeads, existingCustomers] = await Promise.all([
        leadIds.length ? Lead.find({ _id: { $in: leadIds } }).select('_id').lean() : [],
        customerIds.length ? Customer.find({ _id: { $in: customerIds } }).select('_id').lean() : []
      ]);

      const existingLeadIdSet = new Set(existingLeads.map((l) => l._id.toString()));
      const existingCustomerIdSet = new Set(existingCustomers.map((c) => c._id.toString()));

      const toDeleteIds = [];
      for (const f of pendingFollowups) {
        const hasLead = f.leadId && existingLeadIdSet.has(f.leadId.toString());
        const hasCustomer = f.customerId && existingCustomerIdSet.has(f.customerId.toString());
        if (!hasLead && !hasCustomer) {
          toDeleteIds.push(f._id);
        }
      }

      if (toDeleteIds.length > 0) {
        await FollowUp.deleteMany({ _id: { $in: toDeleteIds } });
      }
    } catch {
      // Non-blocking cleanup
    }
  }

  /**
   * Clear all overdue follow-ups
   */
  static async clearOverdueFollowups({ telecallerId, branchId }) {
    const { startOfToday } = businessDateBoundaries();
    const filter = {
      status: FOLLOWUP_STATUS.PENDING,
      scheduledAt: { $lt: startOfToday }
    };
    if (telecallerId) filter.telecallerId = telecallerId;
    if (branchId && branchId !== 'ALL') filter.branchId = branchId;

    const res = await FollowUp.deleteMany(filter);
    return { deletedCount: res.deletedCount };
  }

  /**
   * Get count breakdown for today, overdue, upcoming
   */
  static async getCounts({ telecallerId, branchId }) {
    await this.cleanupOrphanedFollowups();
    const { startOfToday, endOfToday } = businessDateBoundaries();

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

    assertRecordAccess(followup, user, req, 'telecallerId', 'FollowUp');
    if (followup.status === FOLLOWUP_STATUS.COMPLETED) return followup;
    followup.status = FOLLOWUP_STATUS.COMPLETED;
    followup.completedAt = new Date();
    followup.completionNotes = completionNotes;
    await followup.save();

    emitToBranch(followup.branchId.toString(), 'followup:completed', {
      followupId: followup._id,
      branchId: followup.branchId,
      status: followup.status,
      telecallerId: followup.telecallerId
    });
    if (followup.telecallerId) {
      emitToUser(followup.telecallerId.toString(), 'followup:completed', {
        followupId: followup._id,
        branchId: followup.branchId,
        status: followup.status
      });
    }

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
