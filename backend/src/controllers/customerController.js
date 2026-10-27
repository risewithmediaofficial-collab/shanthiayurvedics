import { Customer } from '../models/Customer.js';
import { CustomerService } from '../services/customerService.js';
import { ReorderService } from '../services/reorderService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/errors.js';
import { ROLES } from '../constants/roles.js';
import { emitToBranch } from '../sockets/index.js';

export const getCustomers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const isExport = req.query.export === 'true';
  const limit = isExport ? 5000 : parseInt(req.query.limit, 10) || 20;
  const search = req.query.search?.trim();
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' || req.query.sortOrder === '1' ? 1 : -1;

  const query = {};
  if (!req.branchScope.isGlobal && req.branchScope.branchId) {
    query.branchId = req.branchScope.branchId;
  }

  if (req.user.role === ROLES.TELECALLER) {
    query.assignedTelecallerId = req.user.id;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`);
    }
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { 'addresses.city': { $regex: search, $options: 'i' } }
    ];
  }

  const sortObj = {};
  if (sortBy === 'name') sortObj.name = sortOrder;
  else if (sortBy === 'mobile') sortObj.mobile = sortOrder;
  else if (sortBy === 'city') sortObj['addresses.city'] = sortOrder;
  else if (sortBy === 'totalOrders') sortObj.totalOrders = sortOrder;
  else if (sortBy === 'totalSpent') sortObj.totalSpent = sortOrder;
  else sortObj.createdAt = sortOrder;

  const skip = (page - 1) * limit;
  let findQuery = Customer.find(query)
    .populate('branchId', 'name code')
    .populate('assignedTelecallerId', 'name email')
    .sort(sortObj);

  if (!isExport) {
    findQuery = findQuery.skip(skip).limit(limit);
  }

  const [total, customers] = await Promise.all([
    Customer.countDocuments(query),
    findQuery.lean()
  ]);

  return ApiResponse.paginated(
    res,
    customers,
    { page, limit: isExport ? customers.length : limit, total },
    'Customers retrieved'
  );
});

export const getCustomerById = asyncHandler(async (req, res) => {
  const timeline = await CustomerService.getCustomerTimeline(req.params.id);
  return ApiResponse.success(res, timeline, 'Customer details retrieved');
});

export const convertLead = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const customer = await CustomerService.convertLeadToCustomer(leadId, req.body, req.user, req);
  emitToBranch(customer.branchId?.toString?.() || null, 'customer:created', { customerId: customer._id });
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

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    throw new NotFoundError('Customer');
  }

  const { name, mobile, altMobile, email, fatherName, notes, addresses } = req.body;
  if (name) customer.name = name.trim();
  if (mobile) customer.mobile = mobile.trim();
  if (altMobile !== undefined) customer.altMobile = altMobile.trim();
  if (email !== undefined) customer.email = email.trim();
  if (fatherName !== undefined) customer.fatherName = fatherName.trim();
  if (notes !== undefined) customer.notes = notes.trim();
  if (addresses && Array.isArray(addresses)) customer.addresses = addresses;

  await customer.save();
  emitToBranch(customer.branchId?.toString?.() || null, 'customer:updated', { customerId: customer._id });
  return ApiResponse.success(res, customer, 'Customer updated successfully');
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    throw new NotFoundError('Customer');
  }

  await Customer.findByIdAndDelete(req.params.id);
  emitToBranch(customer.branchId?.toString?.() || null, 'customer:deleted', { customerId: req.params.id });
  return ApiResponse.success(res, null, 'Customer deleted successfully');
});

export const bulkDeleteCustomers = asyncHandler(async (req, res) => {
  const { customerIds } = req.body;
  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    return ApiResponse.badRequest(res, 'No customer IDs provided for deletion');
  }

  const query = { _id: { $in: customerIds } };
  if (!req.branchScope?.isGlobal && req.branchScope?.branchId) {
    query.branchId = req.branchScope.branchId;
  }

  const customersToDelete = await Customer.find(query).lean();
  const idsToDelete = customersToDelete.map((c) => c._id);

  if (idsToDelete.length > 0) {
    await Customer.deleteMany({ _id: { $in: idsToDelete } });
    for (const c of customersToDelete) {
      emitToBranch(c.branchId?.toString?.() || null, 'customer:deleted', { customerId: c._id });
    }
  }

  return ApiResponse.success(res, { deletedCount: idsToDelete.length }, `Successfully deleted ${idsToDelete.length} customers`);
});

export const getCustomerByPhone = asyncHandler(async (req, res) => {
  const timeline = await CustomerService.getCustomerByPhone(req.params.phone);
  if (!timeline) {
    throw new NotFoundError('Customer with this mobile number');
  }
  return ApiResponse.success(res, timeline, 'Customer details retrieved by phone');
});

export const getReordersDue = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const search = req.query.search?.trim() || '';
  const minDays = parseInt(req.query.minDays, 10) || 15;

  const result = await ReorderService.getReordersDue(
    { page, limit, search, minDays },
    req.user,
    req.branchScope
  );

  return ApiResponse.paginated(res, result.data, result.meta, '15-day reorders due retrieved');
});

export const triggerReorderCheck = asyncHandler(async (req, res) => {
  const createdCount = await ReorderService.checkAndCreateReorderNotifications();
  return ApiResponse.success(res, { createdCount }, `Reorder check completed. ${createdCount} notifications generated.`);
});
