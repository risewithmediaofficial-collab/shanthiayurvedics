import { Lead } from '../models/Lead.js';
import { CallHistory } from '../models/CallHistory.js';
import { LeadAssignment } from '../models/LeadAssignment.js';
import { LeadService } from '../services/leadService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/errors.js';
import { ROLES } from '../constants/roles.js';

export const getLeads = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const search = req.query.search?.trim();
  const status = req.query.status;
  const source = req.query.source;
  const assignedTo = req.query.assignedTo;

  const query = {};

  // Telecaller Ownership Filter
  if (req.user.role === ROLES.TELECALLER) {
    // An explicit assignment grants the telecaller access even if the lead
    // originated from another branch.
    query.assignedTo = req.user.id;
  } else if (assignedTo) {
    query.assignedTo = assignedTo;
  }

  // Branch Scope Filter for supervisory views. Telecallers use assignment
  // ownership above so assigned leads are not hidden by branch selection.
  if (req.user.role !== ROLES.TELECALLER && !req.branchScope.isGlobal && req.branchScope.branchId) {
    query.branchId = req.branchScope.branchId;
  }

  if (status) query.status = status;
  if (source) query.source = source;

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const [total, leads] = await Promise.all([
    Lead.countDocuments(query),
    Lead.find(query)
      .populate('assignedTo', 'name email')
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return ApiResponse.paginated(res, leads, { page, limit, total }, 'Leads retrieved successfully');
});

export const getLeadById = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id)
    .populate('assignedTo', 'name email role')
    .populate('branchId', 'name code address phone')
    .populate('convertedCustomerId')
    .populate('duplicateOf', 'name mobile status')
    .lean();

  if (!lead) {
    throw new NotFoundError('Lead');
  }

  // Telecaller ownership check
  if (req.user.role === ROLES.TELECALLER && lead.assignedTo?._id?.toString() !== req.user.id) {
    throw new NotFoundError('Lead');
  }

  // Fetch timeline calls & assignment logs
  const [calls, assignments] = await Promise.all([
    CallHistory.find({ leadId: lead._id })
      .populate('telecallerId', 'name email')
      .sort({ createdAt: -1 })
      .lean(),
    LeadAssignment.find({ leadId: lead._id })
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
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
    'Lead details retrieved'
  );
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

  if (req.user.role === ROLES.TELECALLER && lead.assignedTo?.toString() !== req.user.id) {
    throw new NotFoundError('Lead');
  }

  Object.assign(lead, req.body);
  await lead.save();

  return ApiResponse.success(res, lead, 'Lead updated successfully');
});

export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    throw new NotFoundError('Lead');
  }

  await Lead.findByIdAndDelete(req.params.id);
  return ApiResponse.success(res, null, 'Lead deleted successfully');
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
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const query = {};

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
