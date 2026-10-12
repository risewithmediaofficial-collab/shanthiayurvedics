import { Customer } from '../models/Customer.js';
import { Lead } from '../models/Lead.js';
import { CallHistory } from '../models/CallHistory.js';
import { FollowUp } from '../models/FollowUp.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { LEAD_STATUS } from '../constants/leadStates.js';
import { AuditService } from './auditService.js';

import { Order } from '../models/Order.js';

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
   * Get full 360-degree customer profile timeline with ALL past orders and reorder status
   */
  static async getCustomerTimeline(customerId) {
    const customer = await Customer.findById(customerId)
      .populate('branchId', 'name code')
      .populate('assignedTelecallerId', 'name email role mobile phone')
      .lean();

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const [orders, calls, followups, originalLead] = await Promise.all([
      Order.find({
        $or: [
          { customerId },
          { 'patientDetails.mobile': customer.mobile },
          { 'deliveryAddress.phone': customer.mobile }
        ]
      })
        .populate('branchId', 'name code')
        .populate('telecallerId', 'name email mobile phone')
        .sort({ createdAt: -1 })
        .lean(),
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

    // Calculate 15-day reorder eligibility
    const latestOrder = orders?.[0];
    let isReorderDue = false;
    let daysSinceLastOrder = 0;
    if (latestOrder) {
      const orderDate = new Date(latestOrder.createdAt);
      daysSinceLastOrder = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
      // Reorder due if 15 or more days since last order and order is not cancelled
      if (daysSinceLastOrder >= 15 && latestOrder.status !== 'CANCELLED') {
        isReorderDue = true;
      }
    }

    return {
      customer,
      orders: orders || [],
      calls: calls || [],
      followups: followups || [],
      originalLead,
      reorderStatus: {
        isDue: isReorderDue,
        daysSinceLastOrder,
        latestOrderId: latestOrder?._id,
        latestOrderNumber: latestOrder?.orderNumber,
        latestGrandTotal: latestOrder?.grandTotal,
        latestItems: latestOrder?.items || []
      }
    };
  }

  /**
   * Look up a customer profile & order history by mobile phone number
   */
  static async getCustomerByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    let customer = await Customer.findOne({
      $or: [
        { mobile: cleanPhone },
        { altMobile: cleanPhone },
        { mobile: { $regex: cleanPhone } }
      ]
    });

    if (!customer) {
      // Check if any order exists with this phone number
      const order = await Order.findOne({
        $or: [
          { 'patientDetails.mobile': cleanPhone },
          { 'deliveryAddress.phone': cleanPhone }
        ]
      });

      if (order?.customerId) {
        return this.getCustomerTimeline(order.customerId);
      }
      return null;
    }

    return this.getCustomerTimeline(customer._id);
  }
}

export default CustomerService;
