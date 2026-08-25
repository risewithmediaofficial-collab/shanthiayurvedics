import { Customer } from '../models/Customer.js';
import { CustomerService } from '../services/customerService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/errors.js';
import { ROLES } from '../constants/roles.js';

export const getCustomers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const search = req.query.search?.trim();

  const query = {};
  if (!req.branchScope.isGlobal && req.branchScope.branchId) {
    query.branchId = req.branchScope.branchId;
  }

  if (req.user.role === ROLES.TELECALLER) {
    query.assignedTelecallerId = req.user.id;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const [total, customers] = await Promise.all([
    Customer.countDocuments(query),
    Customer.find(query)
      .populate('branchId', 'name code')
      .populate('assignedTelecallerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return ApiResponse.paginated(res, customers, { page, limit, total }, 'Customers retrieved');
});

export const getCustomerById = asyncHandler(async (req, res) => {
  const timeline = await CustomerService.getCustomerTimeline(req.params.id);
  return ApiResponse.success(res, timeline, 'Customer details retrieved');
});

export const convertLead = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const customer = await CustomerService.convertLeadToCustomer(leadId, req.body, req.user, req);
  return ApiResponse.created(res, customer, 'Lead converted to customer successfully');
});

export const addCustomerAddress = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    throw new NotFoundError('Customer');
  }

  customer.addresses.push(req.body);
  await customer.save();

  return ApiResponse.success(res, customer, 'Customer address added');
});
