import { Customer } from '../models/Customer.js';
import { Lead } from '../models/Lead.js';
import { CallHistory } from '../models/CallHistory.js';
import { FollowUp } from '../models/FollowUp.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { LEAD_STATUS } from '../constants/leadStates.js';
import { AuditService } from './auditService.js';

export class CustomerService {
  /**
   * Convert a lead to a Customer
   */
  static async convertLeadToCustomer(leadId, customerData, user, req) {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new NotFoundError('Lead');
    }

    if (lead.convertedCustomerId) {
      const existingCustomer = await Customer.findById(lead.convertedCustomerId);
      return existingCustomer;
    }

    // Check if customer with same mobile already exists
    const existing = await Customer.findOne({ mobile: lead.mobile });
    if (existing) {
      lead.convertedCustomerId = existing._id;
      lead.status = LEAD_STATUS.CONVERTED;
      await lead.save();
      return existing;
    }

    const defaultAddress = {
      addressType: 'HOME',
      street: customerData.street || lead.notes || 'Main Street',
      landmark: customerData.landmark || '',
      city: customerData.city || lead.city || 'Hosur',
      state: customerData.state || lead.state || 'Tamil Nadu',
      pincode: customerData.pincode || lead.pincode || '635109',
      isDefault: true
    };

    const newCustomer = new Customer({
      name: customerData.name || lead.name,
      mobile: lead.mobile,
      altMobile: customerData.altMobile || lead.altMobile,
      email: customerData.email || lead.email,
      whatsappNumber: customerData.whatsappNumber || lead.whatsappNumber || lead.mobile,
      branchId: lead.branchId,
      assignedTelecallerId: lead.assignedTo || user.id,
      createdFromLeadId: lead._id,
      addresses: customerData.addresses || [defaultAddress],
      notes: customerData.notes || lead.notes
    });

    await newCustomer.save();

    // Update lead status
    lead.convertedCustomerId = newCustomer._id;
    lead.status = LEAD_STATUS.CONVERTED;
    await lead.save();

    await AuditService.log({
      userId: user.id,
      branchId: lead.branchId,
      action: 'LEAD_CONVERTED_TO_CUSTOMER',
      module: 'customers',
      resourceType: 'Customer',
      resourceId: newCustomer._id,
      newValue: { leadId: lead._id, customerId: newCustomer._id },
      req
    });

    return newCustomer;
  }

  /**
   * Get full 360-degree customer profile timeline
   */
  static async getCustomerTimeline(customerId) {
    const customer = await Customer.findById(customerId)
      .populate('branchId', 'name code')
      .populate('assignedTelecallerId', 'name email role')
      .lean();

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const [calls, followups, originalLead] = await Promise.all([
      CallHistory.find({
        $or: [{ customerId }, { leadId: customer.createdFromLeadId }]
      })
        .populate('telecallerId', 'name email')
        .sort({ createdAt: -1 })
        .lean(),
      FollowUp.find({
        $or: [{ customerId }, { leadId: customer.createdFromLeadId }]
      })
        .populate('telecallerId', 'name email')
        .sort({ scheduledAt: -1 })
        .lean(),
      customer.createdFromLeadId
        ? Lead.findById(customer.createdFromLeadId).lean()
        : null
    ]);

    return {
      customer,
      calls,
      followups,
      originalLead
    };
  }
}

export default CustomerService;
