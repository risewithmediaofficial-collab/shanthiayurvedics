import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { OrderStatusHistory } from '../models/OrderStatusHistory.js';
import { Inventory } from '../models/Inventory.js';
import { Lead } from '../models/Lead.js';
import { OrderService } from '../services/orderService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/errors.js';
import { ROLES } from '../constants/roles.js';

export const getOrders = asyncHandler(async (req, res) => {
  const isExport = req.query.export === 'true';
  const page = parseInt(req.query.page, 10) || 1;
  const limit = isExport ? 5000 : parseInt(req.query.limit, 10) || 20;
  const status = req.query.status;
  const district = req.query.district?.trim();
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const search = req.query.search?.trim();
  const paymentMethod = req.query.paymentMethod;
  const telecallerId = req.query.telecallerId;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' || req.query.sortOrder === '1' ? 1 : -1;

  const query = {};
  if (!req.branchScope.isGlobal && req.branchScope.branchId) {
    query.branchId = req.branchScope.branchId;
  }

  if (req.user.role === ROLES.TELECALLER) {
    query.telecallerId = req.user.id;
  } else if (telecallerId && telecallerId !== 'ALL') {
    query.telecallerId = telecallerId;
  }

  if (status && status !== 'ALL') {
    const s = status.trim().toUpperCase();
    if (s === 'IN_TRANSIT' || s === 'TRANSIT' || s === 'SHIPPED' || s === 'DISPATCHED') {
      query.status = { $in: ['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] };
    } else if (status.includes(',')) {
      query.status = { $in: status.split(',').map((item) => item.trim()).filter(Boolean) };
    } else {
      query.status = status;
    }
  }

  if (district && district !== 'ALL') {
    query['deliveryAddress.district'] = { $regex: district, $options: 'i' };
  }

  if (paymentMethod && paymentMethod !== 'ALL') {
    query.paymentMethod = paymentMethod;
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
    const searchConditions = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { trackingNumber: { $regex: search, $options: 'i' } },
      { 'patientDetails.patientName': { $regex: search, $options: 'i' } },
      { 'patientDetails.mobile': { $regex: search, $options: 'i' } },
      { 'deliveryAddress.phone': { $regex: search, $options: 'i' } },
      { 'deliveryAddress.city': { $regex: search, $options: 'i' } },
      { 'deliveryAddress.district': { $regex: search, $options: 'i' } },
      { status: { $regex: search, $options: 'i' } }
    ];
    if (/transit/i.test(search)) {
      searchConditions.push({ status: { $in: ['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } });
    }
    if (/ship/i.test(search)) {
      searchConditions.push({ status: { $in: ['DISPATCHED', 'IN_TRANSIT', 'READY_FOR_DISPATCH'] } });
    }
    if (/deliver/i.test(search)) {
      searchConditions.push({ status: 'DELIVERED' });
    }
    query.$or = searchConditions;
  }

  // Dynamic sorting configuration
  const sortObj = {};
  if (sortBy === 'grandTotal' || sortBy === 'total' || sortBy === 'amount') {
    sortObj.grandTotal = sortOrder;
  } else if (sortBy === 'status') {
    sortObj.status = sortOrder;
  } else if (sortBy === 'orderNumber') {
    sortObj.orderNumber = sortOrder;
  } else if (sortBy === 'patientName' || sortBy === 'name' || sortBy === 'customer') {
    sortObj['patientDetails.patientName'] = sortOrder;
  } else {
    sortObj.createdAt = sortOrder;
  }

  const skip = (page - 1) * limit;
  const [total, orders, revenueAgg] = await Promise.all([
    Order.countDocuments(query),
    Order.find(query)
      .populate('customerId', 'name mobile email')
      .populate('telecallerId', 'name email')
      .populate('branchId', 'name code')
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.aggregate([
      {
        $match: {
          ...query,
          ...(query.branchId && mongoose.Types.ObjectId.isValid(query.branchId)
            ? { branchId: new mongoose.Types.ObjectId(query.branchId) }
            : {}),
          status: { $ne: 'CANCELLED' }
        }
      },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ])
  ]);

  const totalRevenue = revenueAgg[0]?.total || 0;

  return ApiResponse.paginated(res, orders, { page, limit, total, totalRevenue, sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' }, 'Orders retrieved');
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customerId', 'name mobile email addresses')
    .populate('telecallerId', 'name email role')
    .populate('branchId', 'name code address phone')
    .lean();

  if (!order) {
    throw new NotFoundError('Order');
  }

  if (req.user.role === ROLES.TELECALLER && order.telecallerId?._id?.toString() !== req.user.id) {
    throw new NotFoundError('Order');
  }

  const statusHistory = await OrderStatusHistory.find({ orderId: order._id })
    .populate('changedBy', 'name email role')
    .sort({ timestamp: -1 })
    .lean();

  return ApiResponse.success(res, { ...order, statusHistory }, 'Order details retrieved');
});

export const createOrder = asyncHandler(async (req, res) => {
  const order = await OrderService.createOrder(req.body, req.user, req);
  return ApiResponse.created(res, order, 'Order created and stock reserved successfully');
});

export const transitionOrderStatus = asyncHandler(async (req, res) => {
  const { status, notes, cancellationReason, forceRevert } = req.body;
  const isManagerOrAbove = [ROLES.OWNER, ROLES.MANAGER, ROLES.DISTRIBUTOR].includes(req.user.role);

  const order = await OrderService.transitionStatus(req.params.id, status, {
    changedBy: req.user,
    notes,
    cancellationReason,
    forceRevert: Boolean(forceRevert && isManagerOrAbove),
    req
  });
  return ApiResponse.success(res, order, `Order transitioned to ${status}`);
});

export const bulkTransitionOrders = asyncHandler(async (req, res) => {
  const { orderIds, status, notes, forceRevert } = req.body;
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return ApiResponse.error(res, 'orderIds array is required', 400);
  }
  if (!status) {
    return ApiResponse.error(res, 'status is required', 400);
  }

  const isManagerOrAbove = [ROLES.OWNER, ROLES.MANAGER, ROLES.DISTRIBUTOR].includes(req.user.role);
  const result = await OrderService.bulkTransitionStatus(orderIds, status, {
    forceRevert: Boolean(forceRevert && isManagerOrAbove),
    changedBy: req.user,
    notes,
    req
  });

  return ApiResponse.success(res, result, `Bulk transitioned ${result.successCount} orders to ${status}`);
});

export const bulkAssignVerification = asyncHandler(async (req, res) => {
  const { orderIds, telecallerId } = req.body;
  if (!orderIds || !Array.isArray(orderIds) || !telecallerId) {
    return ApiResponse.error(res, 'orderIds array and telecallerId are required', 400);
  }

  const result = await OrderService.bulkAssignVerification(orderIds, telecallerId, req.user, req);
  return ApiResponse.success(res, result, `Assigned ${result.updatedCount} orders to telecaller`);
});

export const bulkVerifyOrders = asyncHandler(async (req, res) => {
  const { orderIds } = req.body;
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return ApiResponse.error(res, 'orderIds array is required', 400);
  }

  const result = await OrderService.bulkVerifyOrders(orderIds, req.user, req);
  return ApiResponse.success(res, result, `Verified ${result.verifiedCount} orders`);
});

export const autoDispatchOrders = asyncHandler(async (req, res) => {
  const branchId = req.branchScope.isGlobal ? req.body.branchId : req.branchScope.branchId;
  const result = await OrderService.autoDispatchOrders(branchId, req.user, req);
  return ApiResponse.success(res, result, `Auto-dispatched ${result.count} orders successfully`);
});

export const importExcelOrders = asyncHandler(async (req, res) => {
  const { orders } = req.body;
  if (!orders || !Array.isArray(orders) || orders.length === 0) {
    return ApiResponse.error(res, 'orders array is required', 400);
  }

  const branchId = req.branchScope.branchId || req.user.branchId;
  const result = await OrderService.importOrdersBatch(orders, branchId, req.user, req);
  return ApiResponse.success(res, result, `Imported ${result.imported} orders (${result.failed} failed)`);
});

export const exportOrders = asyncHandler(async (req, res) => {
  const query = {};
  if (!req.branchScope.isGlobal && req.branchScope.branchId) {
    query.branchId = req.branchScope.branchId;
  }
  if (req.query.status && req.query.status !== 'ALL') {
    const s = req.query.status.trim().toUpperCase();
    if (s === 'IN_TRANSIT' || s === 'TRANSIT' || s === 'SHIPPED' || s === 'DISPATCHED') {
      query.status = { $in: ['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] };
    } else {
      query.status = req.query.status;
    }
  }
  if (req.query.district && req.query.district !== 'ALL') {
    query['deliveryAddress.district'] = { $regex: req.query.district, $options: 'i' };
  }
  if (req.query.orderIds) {
    const ids = req.query.orderIds.split(',').filter(Boolean);
    if (ids.length > 0) query._id = { $in: ids };
  }

  const orders = await Order.find(query)
    .populate('customerId', 'name mobile email')
    .populate('telecallerId', 'name')
    .populate('branchId', 'name code')
    .sort({ createdAt: -1 })
    .lean();

  return ApiResponse.success(res, orders, `Export data retrieved for ${orders.length} orders`);
});

export const getOrderMetricsSummary = asyncHandler(async (req, res) => {
  const branchId = (!req.branchScope.isGlobal && req.branchScope.branchId)
    ? req.branchScope.branchId
    : null;
  const branchObjectId = branchId && mongoose.Types.ObjectId.isValid(branchId)
    ? new mongoose.Types.ObjectId(branchId)
    : null;

  const branchFilter = branchId ? { branchId } : {};
  const branchAggFilter = branchObjectId ? { branchId: branchObjectId } : {};

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalOrders,
    todayOrdersAgg,
    shippedCount,
    packedCount,
    toVerifyCount,
    inQueueCount,
    lowStockCount,
    totalRevenueAgg,
    totalLeads,
    deliveredOrdersCount,
    newOrdersCount,
    confirmedOrdersCount,
    processingCount,
    rtoOrdersCount,
    cancelledCount
  ] = await Promise.all([
    Order.countDocuments(branchFilter),
    Order.aggregate([
      { $match: { ...branchAggFilter, createdAt: { $gte: startOfToday }, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
    ]),
    Order.countDocuments({ ...branchFilter, status: { $in: ['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } }),
    Order.countDocuments({ ...branchFilter, status: 'PACKED' }),
    Order.countDocuments({ ...branchFilter, status: 'NEW' }),
    Order.countDocuments({ ...branchFilter, status: { $in: ['PROCESSING', 'READY_FOR_PACKING', 'PACKED', 'READY_FOR_DISPATCH'] } }),
    Inventory.countDocuments({ ...(branchObjectId ? { branchId: branchObjectId } : {}), availableQuantity: { $lte: 20 } }),
    Order.aggregate([
      { $match: { ...branchAggFilter, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]),
    Lead.countDocuments(branchFilter),
    Order.countDocuments({ ...branchFilter, status: 'DELIVERED' }),
    Order.countDocuments({ ...branchFilter, status: 'NEW' }),
    Order.countDocuments({ ...branchFilter, status: 'CONFIRMED' }),
    Order.countDocuments({ ...branchFilter, status: 'PROCESSING' }),
    Order.countDocuments({ ...branchFilter, status: 'RTO' }),
    Order.countDocuments({ ...branchFilter, status: 'CANCELLED' })
  ]);

  return ApiResponse.success(res, {
    totalOrders,
    todayRev: todayOrdersAgg[0]?.total || 0,
    todayOrdersCount: todayOrdersAgg[0]?.count || 0,
    shippedCount,
    packedCount,
    toVerifyCount,
    inQueueCount,
    lowStockCount,
    totalRevenue: totalRevenueAgg[0]?.total || 0,
    totalLeads,
    deliveredOrdersCount,
    newOrdersCount,
    confirmedOrdersCount,
    processingCount,
    rtoOrdersCount,
    cancelledCount
  }, 'Order metrics summary retrieved');
});

export const getDistinctDistricts = asyncHandler(async (req, res) => {
  const districts = await Order.distinct('deliveryAddress.district');
  const filtered = districts.filter(Boolean).sort();
  return ApiResponse.success(res, filtered, 'Districts retrieved');
});

export const updateOrder = asyncHandler(async (req, res) => {
  const order = await OrderService.updateOrder(req.params.id, req.body, req.user, req);
  return ApiResponse.success(res, order, 'Order updated successfully');
});

export const deleteOrder = asyncHandler(async (req, res) => {
  const result = await OrderService.deleteOrder(req.params.id, req.user, req);
  return ApiResponse.success(res, result, 'Order deleted successfully');
});

