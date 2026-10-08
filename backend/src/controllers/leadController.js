import { AuditService } from '../services/auditService.js';
import { AppError } from '../utils/errors.js';
import { recordScope } from '../utils/recordScope.js';
import { pagination, escapeSearch, dateRange } from '../utils/queryHelpers.js';
import { Lead } from '../models/Lead.js';
import { CallHistory } from '../models/CallHistory.js';
import { LeadAssignment } from '../models/LeadAssignment.js';
import { LeadService } from '../services/leadService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/errors.js';
import { ROLES } from '../constants/roles.js';

export const getLeads = asyncHandler(async (req, res) => {
  const { page, limit } = pagination(req.query);
  const search = req.query.search ? escapeSearch(req.query.search.trim()) : '';
  const status = req.query.status;
  const source = req.query.source;
  const assignedTo = req.query.assignedTo;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' || req.query.sortOrder === '1' ? 1 : -1;

  const query = recordScope(req.user, req, 'assignedTo');

  // Telecaller Ownership Filter
  if (req.user.role === ROLES.TELECALLER) {
    query.assignedTo = req.user.id;
  } else if (assignedTo && assignedTo !== 'ALL') {
    query.assignedTo = assignedTo;
  }

  // Branch Scope Filter for supervisory views.
  if (req.user.role !== ROLES.TELECALLER && !req.branchScope.isGlobal && req.branchScope.branchId) {
    query.branchId = req.branchScope.branchId;
  }

  if (status && status !== 'ALL') {
    if (status.includes(',')) {
      query.status = { $in: status.split(',').map((s) => s.trim()).filter(Boolean) };
    } else {
      query.status = status;
    }
  }

  if (source && source !== 'ALL') query.source = source;

  if (startDate || endDate) {
    query.createdAt = dateRange(startDate, endDate);
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } }
    ];
  }

  const sortObj = {};
  if (sortBy === 'name') {
    sortObj.name = sortOrder;
  } else if (sortBy === 'status') {
    sortObj.status = sortOrder;
  } else if (sortBy === 'source') {
    sortObj.source = sortOrder;
  } else if (sortBy === 'city') {
    sortObj.city = sortOrder;
  } else if (sortBy === 'updatedAt') {
    sortObj.updatedAt = sortOrder;
  } else {
    sortObj.createdAt = sortOrder;
  }

  const skip = (page - 1) * limit;
  const baseStatusQuery = { ...query };
  delete baseStatusQuery.status;

  const [total, leads, newCount, assignedCount, contactedCount, interestedCount, convertedCount] = await Promise.all([
    Lead.countDocuments(query),
    Lead.find(query)
      .populate('assignedTo', 'name email')
      .populate('branchId', 'name code')
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    Lead.countDocuments({ ...baseStatusQuery, status: 'NEW' }),
    Lead.countDocuments({ ...baseStatusQuery, status: 'ASSIGNED' }),
    Lead.countDocuments({ ...baseStatusQuery, status: 'CONTACTED' }),
    Lead.countDocuments({ ...baseStatusQuery, status: 'INTERESTED' }),
    Lead.countDocuments({ ...baseStatusQuery, status: 'CONVERTED' })
  ]);

  const leadIds = leads.map((l) => l._id);
  let leadsWithStats = leads;
  if (leadIds.length > 0) {
    const callStats = await CallHistory.aggregate([
      { $match: { leadId: { $in: leadIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$leadId',
          callCount: { $sum: 1 },
          lastCall: { $first: '$$ROOT' }
        }
      }
    ]);
    const statsMap = new Map(callStats.map((s) => [s._id.toString(), s]));
    leadsWithStats = leads.map((l) => {
      const s = statsMap.get(l._id.toString());
      return {
        ...l,
        callCount: s ? s.callCount : 0,
        lastCall: s?.lastCall
          ? {
              _id: s.lastCall._id,
              callStatus: s.lastCall.callStatus,
              notes: s.lastCall.notes,
              callDurationSeconds: s.lastCall.callDurationSeconds,
              createdAt: s.lastCall.createdAt
            }
          : null
      };
    });
  }

  return ApiResponse.paginated(
    res,
    leadsWithStats,
    { page, limit, total, sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
    'Leads retrieved successfully',
    {
      statusCounts: {
        NEW: newCount,
        ASSIGNED: assignedCount,
        CONTACTED: contactedCount,
        INTERESTED: interestedCount,
        CONVERTED: convertedCount
      }
    }
  );
});

export const getLeadById = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id)
    .populate('assignedTo', 'name email role phone')
    .populate('branchId', 'name code address phone')
    .populate('convertedCustomerId')
    .populate('interestedProducts', 'name sku price')
    .populate('duplicateOf', 'name mobile status')
    .lean();

  if (!lead) {
    throw new NotFoundError('Lead');
  }

  // Telecaller ownership check
  if (req.user.role === ROLES.TELECALLER && (lead.assignedTo?._id?.toString() || lead.assignedTo?.toString()) !== req.user.id) {
    throw new NotFoundError('Lead');
  }

  // Fetch timeline calls & assignment logs
  const [calls, assignments] = await Promise.all([
    CallHistory.find({ leadId: lead._id })
      .populate('telecallerId', 'name email role')
      .sort({ createdAt: -1 })
      .lean(),
    LeadAssignment.find({ leadId: lead._id })
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean()
  ]);

  return ApiResponse.success(
    res,
    {
      lead,
      calls,
      assignments
    },
    'Lead details retrieved successfully'
  );
});

export const getLeadCalls = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    throw new NotFoundError('Lead');
  }

  if (req.user.role === ROLES.TELECALLER && (lead.assignedTo?._id?.toString() || lead.assignedTo?.toString()) !== req.user.id) {
    throw new NotFoundError('Lead');
  }

  const calls = await CallHistory.find({ leadId: lead._id })
    .populate('telecallerId', 'name email role')
    .sort({ createdAt: -1 })
    .lean();

  return ApiResponse.success(res, calls, 'Lead calls retrieved successfully');
});

export const createLead = asyncHandler(async (req, res) => {
  const result = await LeadService.createLead(req.body, req.user, req);

  if (result.isDuplicateWarning) {
    return res.status(200).json({
      success: false,
      isDuplicateWarning: true,
      message: 'Possible duplicate lead detected',
      data: result.duplicateInfo
    });
  }

  return ApiResponse.created(res, result.lead, 'Lead created successfully');
});

export const updateLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    throw new NotFoundError('Lead');
  }

  const updates = { ...req.body };
  if (updates.branchId && updates.branchId !== lead.branchId.toString()) throw new AppError('Use a dedicated reassignment workflow to move records between branches', 400);
  if (updates.assignedTo !== undefined && String(updates.assignedTo || '') !== String(lead.assignedTo || '')) throw new AppError('Use Assign lead to change its owner', 400);
  const oldValue = lead.toObject();
  if (!updates.branchId) {
    delete updates.branchId;
  }
  // Remove undefined fields
  Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

  Object.assign(lead, updates);
  await lead.save();

  await AuditService.log({ userId: req.user.id, branchId: lead.branchId, action: 'LEAD_UPDATED', module: 'leads', resourceType: 'Lead', resourceId: lead._id, oldValue, newValue: lead.toObject(), req });
  return ApiResponse.success(res, lead, 'Lead updated successfully');
});

export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    throw new NotFoundError('Lead');
  }

  // Retain append-only call and assignment history for the audit trail.
  await AuditService.log({ userId: req.user.id, branchId: lead.branchId, action: 'LEAD_DELETED', module: 'leads', resourceType: 'Lead', resourceId: lead._id, oldValue: lead.toObject(), req });
  await Lead.findByIdAndDelete(req.params.id);
  return ApiResponse.success(res, { id: req.params.id, name: lead.name }, 'Lead deleted successfully');
});

export const logCall = asyncHandler(async (req, res) => {
  const callLog = await LeadService.logCall(req.params.id, req.body, req.user, req);
  return ApiResponse.created(res, callLog, 'Call logged successfully');
});

export const assignLead = asyncHandler(async (req, res) => {
  const { assignedTo, reason } = req.body;
  const lead = await LeadService.reassignLead(req.params.id, assignedTo, reason, req.user, req);
  return ApiResponse.success(res, lead, 'Lead assigned successfully');
});

export const bulkAssignLeads = asyncHandler(async (req, res) => {
  const { leadIds, assignedTo, reason } = req.body;
  const result = await LeadService.bulkAssignLeads(leadIds, assignedTo, reason, req.user, req);
  return ApiResponse.success(res, result, `Assigned ${result.assignedCount} leads successfully`);
});

export const getCallHistory = asyncHandler(async (req, res) => {
  const { page, limit } = pagination(req.query);
  const query = recordScope(req.user, req, 'telecallerId');
  if (req.user.role !== ROLES.TELECALLER && req.query.telecallerId) query.telecallerId = req.query.telecallerId;

  if (!req.branchScope.isGlobal && req.branchScope.branchId) {
    query.branchId = req.branchScope.branchId;
  }
  if (req.user.role === ROLES.TELECALLER) {
    query.telecallerId = req.user.id;
  }

  const skip = (page - 1) * limit;
  const [total, calls] = await Promise.all([
    CallHistory.countDocuments(query),
    CallHistory.find(query)
      .populate('leadId', 'name mobile city status')
      .populate('customerId', 'name mobile')
      .populate('telecallerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return ApiResponse.paginated(res, calls, { page, limit, total }, 'Call history retrieved successfully');
});
