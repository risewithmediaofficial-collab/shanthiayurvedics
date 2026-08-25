import { Order } from '../models/Order.js';
import { OrderStatusHistory } from '../models/OrderStatusHistory.js';
import { OrderService } from '../services/orderService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/errors.js';
import { ROLES } from '../constants/roles.js';

export const getOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const status = req.query.status;
  const search = req.query.search?.trim();

  const query = {};
  if (!req.branchScope.isGlobal && req.branchScope.branchId) {
    query.branchId = req.branchScope.branchId;
  }

  if (req.user.role === ROLES.TELECALLER) {
    query.telecallerId = req.user.id;
  }

  if (status && status !== 'ALL') {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'deliveryAddress.phone': { $regex: search, $options: 'i' } },
      { 'deliveryAddress.city': { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const [total, orders] = await Promise.all([
    Order.countDocuments(query),
    Order.find(query)
      .populate('customerId', 'name mobile email')
      .populate('telecallerId', 'name email')
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return ApiResponse.paginated(res, orders, { page, limit, total }, 'Orders retrieved');
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
  const { status, notes, cancellationReason } = req.body;
  const order = await OrderService.transitionStatus(req.params.id, status, {
    changedBy: req.user,
    notes,
    cancellationReason,
    req
  });
  return ApiResponse.success(res, order, `Order transitioned to ${status}`);
});
