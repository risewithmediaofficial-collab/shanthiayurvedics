import { Lead } from '../models/Lead.js';
import { Customer } from '../models/Customer.js';
import { Branch } from '../models/Branch.js';
import { CallHistory } from '../models/CallHistory.js';
import { LeadAssignment } from '../models/LeadAssignment.js';
import { FollowUp } from '../models/FollowUp.js';
import { User } from '../models/User.js';
import { NotFoundError, AppError } from '../utils/errors.js';
import { AuditService } from './auditService.js';
import { emitToUser } from '../sockets/index.js';
import { LEAD_SOURCES, LEAD_STATUS, CALL_STATUS, FOLLOWUP_STATUS } from '../constants/leadStates.js';

export class LeadService {
  /**
   * Check for duplicate leads or existing customer
   */
  static async checkDuplicate({ mobile, email, whatsappNumber }) {
    const conditions = [];
    if (mobile && typeof mobile === 'string' && mobile.trim()) {
      conditions.push({ mobile: mobile.trim() });
    }
    if (email && typeof email === 'string' && email.trim()) {
      conditions.push({ email: email.toLowerCase().trim() });
    }
    if (whatsappNumber && typeof whatsappNumber === 'string' && whatsappNumber.trim()) {
      conditions.push({ whatsappNumber: whatsappNumber.trim() });
    }

    if (conditions.length === 0) return { isDuplicate: false };

    const [existingLead, existingCustomer] = await Promise.all([
      Lead.findOne({ $or: conditions })
        .populate('assignedTo', 'name email')
        .populate('branchId', 'name code')
        .lean(),
      Customer.findOne({ $or: conditions })
        .populate('assignedTelecallerId', 'name email')
        .lean()
    ]);

    if (existingLead || existingCustomer) {
      return {
        isDuplicate: true,
        existingLead,
        existingCustomer,
        assignedUser: existingLead?.assignedTo || existingCustomer?.assignedTelecallerId,
        currentStatus: existingLead?.status,
        lastContactDate: existingLead?.lastContactedAt
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Create a new Lead with optional force duplicate override
   */
  static async createLead(data, creatorUser, req) {
    const mobile = (data.mobile || '').toString().trim();
    const email = data.email && typeof data.email === 'string' && data.email.trim() ? data.email.toLowerCase().trim() : undefined;
    const whatsappNumber = data.whatsappNumber && typeof data.whatsappNumber === 'string' && data.whatsappNumber.trim() ? data.whatsappNumber.trim() : mobile;

    const duplicateCheck = await this.checkDuplicate({
      mobile,
      email,
      whatsappNumber
    });

    let isDuplicate = false;
    let duplicateOf = null;

    if (duplicateCheck.isDuplicate) {
      if (!data.forceCreate) {
        return {
          isDuplicateWarning: true,
          duplicateInfo: duplicateCheck
        };
      }
      isDuplicate = true;
      duplicateOf = duplicateCheck.existingLead?._id || null;
    }

    // Resolve branch ID gracefully
    let branchId = data.branchId || req?.branchScope?.branchId || creatorUser?.branchId || (Array.isArray(creatorUser?.branches) && creatorUser.branches[0]);
    if (!branchId || branchId === 'ALL') {
      const defaultBranch = (await Branch.findOne({ isActive: true })) || (await Branch.findOne());
      branchId = defaultBranch?._id;
    }

    // Resolve source
    const rawSource = (data.source || LEAD_SOURCES.MANUAL).toString().toUpperCase();
    const source = LEAD_SOURCES[rawSource] || LEAD_SOURCES.MANUAL;

    const newLead = new Lead({
      name: (data.name || '').trim(),
      mobile,
      altMobile: data.altMobile?.trim() || undefined,
      email,
      whatsappNumber,
      source,
      status: LEAD_STATUS.NEW,
      branchId,
      assignedTo: data.assignedTo || (creatorUser?.role === 'TELECALLER' ? creatorUser.id : null),
      city: data.city?.trim() || undefined,
      state: data.state?.trim() || undefined,
      pincode: data.pincode?.trim() || undefined,
      interestedProducts: data.interestedProducts || [],
      notes: data.notes?.trim() || undefined,
      isDuplicate,
      duplicateOf
    });

    await newLead.save();

    // If assigned, log assignment record and emit socket event
    if (newLead.assignedTo) {
      await LeadAssignment.create({
        leadId: newLead._id,
        assignedTo: newLead.assignedTo,
        assignedBy: creatorUser.id,
        branchId: newLead.branchId,
        reason: 'Initial Assignment'
      });

      emitToUser(newLead.assignedTo.toString(), 'lead:assigned', {
        leadId: newLead._id,
        name: newLead.name,
        mobile: newLead.mobile
      });
    }

    await AuditService.log({
      userId: creatorUser.id,
      branchId: newLead.branchId,
      action: 'LEAD_CREATED',
      module: 'leads',
      resourceType: 'Lead',
      resourceId: newLead._id,
      newValue: newLead.toObject(),
      req
    });

    const populatedLead = await Lead.findById(newLead._id)
      .populate('assignedTo', 'name email role')
      .populate('branchId', 'name code')
      .populate('interestedProducts', 'name sku price');

    return {
      isDuplicateWarning: false,
      lead: populatedLead
    };
  }

  /**
   * Log a call outcome non-destructively
   */
  static async logCall(leadId, callData, telecallerUser, req) {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new NotFoundError('Lead');
    }

    const rawCallStatus = (callData.callStatus || callData.outcome || CALL_STATUS.INTERESTED).toString().toUpperCase();
    const callStatus = CALL_STATUS[rawCallStatus] || rawCallStatus;
    const notes = callData.notes || 'Call logged';
    const callDurationSeconds = Number(callData.callDurationSeconds ?? callData.durationSeconds ?? 0);
    const nextFollowUpAt = callData.nextFollowUpAt || callData.nextFollowUpDate || null;
    const priority = callData.priority || 'MEDIUM';
    const updateLeadStatus = callData.updateLeadStatus;

    // 1. Create append-only call history record
    const callLog = new CallHistory({
      leadId: lead._id,
      telecallerId: telecallerUser.id,
      branchId: lead.branchId,
      callStatus,
      notes,
      callDurationSeconds,
      callStartedAt: callData.callStartedAt || new Date(Date.now() - callDurationSeconds * 1000),
      callEndedAt: new Date(),
      nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
      priority
    });
    await callLog.save();

    // 2. Update lead timestamps and status
    lead.lastContactedAt = new Date();
    if (nextFollowUpAt) {
      lead.nextFollowUpAt = new Date(nextFollowUpAt);
    }
    if (updateLeadStatus) {
      lead.status = updateLeadStatus;
    } else if (callStatus === 'INTERESTED' || callStatus === 'CONNECTED_INTERESTED') {
      lead.status = LEAD_STATUS.INTERESTED;
    } else if (callStatus === 'NOT_INTERESTED' || callStatus === 'CONNECTED_NOT_INTERESTED') {
      lead.status = LEAD_STATUS.NOT_INTERESTED;
    } else if (callStatus === 'INVALID_NUMBER' || callStatus === 'WRONG_NUMBER') {
      lead.status = LEAD_STATUS.INVALID;
    } else if (callStatus === 'NO_ANSWER' || callStatus === 'BUSY' || callStatus === 'SWITCHED_OFF') {
      lead.status = LEAD_STATUS.CONTACTED;
    } else if (nextFollowUpAt || callStatus === 'CALL_LATER' || callStatus === 'CONNECTED_CALLBACK_REQUESTED') {
      lead.status = LEAD_STATUS.FOLLOW_UP;
    }

    await lead.save();

    // 3. Create follow-up task if date provided
    if (nextFollowUpAt) {
      await FollowUp.create({
        leadId: lead._id,
        telecallerId: telecallerUser.id,
        branchId: lead.branchId,
        scheduledAt: new Date(nextFollowUpAt),
        priority,
        notes: `Call Follow-up: ${notes}`,
        status: FOLLOWUP_STATUS.PENDING
      });
    }

    await AuditService.log({
      userId: telecallerUser.id,
      branchId: lead.branchId,
      action: 'LEAD_CALL_LOGGED',
      module: 'leads',
      resourceType: 'CallHistory',
      resourceId: callLog._id,
      newValue: { leadId, callStatus, notes, nextFollowUpAt },
      req
    });

    return callLog;
  }

  /**
   * Reassign a Lead to another telecaller
   */
  static async reassignLead(leadId, newTelecallerId, reason, managerUser, req) {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new NotFoundError('Lead');
    }

    const telecaller = await User.findOne({
      _id: newTelecallerId,
      role: 'TELECALLER',
      isActive: true
    });
    if (!telecaller) {
      throw new AppError('Lead can only be assigned to an active telecaller', 400);
    }

    const previousAssigned = lead.assignedTo;
    lead.assignedTo = newTelecallerId;
    await lead.save();

    await LeadAssignment.create({
      leadId: lead._id,
      assignedTo: newTelecallerId,
      assignedBy: managerUser.id,
      branchId: lead.branchId,
      reason: reason || 'Manager Reassignment'
    });

    emitToUser(newTelecallerId.toString(), 'lead:assigned', {
      leadId: lead._id,
      name: lead.name,
      reassigned: true
    });

    await AuditService.log({
      userId: managerUser.id,
      branchId: lead.branchId,
      action: 'LEAD_REASSIGNED',
      module: 'leads',
      resourceType: 'Lead',
      resourceId: lead._id,
      oldValue: { assignedTo: previousAssigned },
      newValue: { assignedTo: newTelecallerId, reason },
      req
    });

    return lead;
  }

  /**
   * Bulk Reassign Leads to a Telecaller
   */
  static async bulkAssignLeads(leadIds, newTelecallerId, reason, managerUser, req) {
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      throw new AppError('No leads selected for assignment', 400);
    }
    const updated = [];
    for (const id of leadIds) {
      try {
        const lead = await this.reassignLead(id, newTelecallerId, reason, managerUser, req);
        updated.push(lead._id);
      } catch (err) {
        // continue
      }
    }
    return { assignedCount: updated.length, leadIds: updated };
  }
}

export default LeadService;
