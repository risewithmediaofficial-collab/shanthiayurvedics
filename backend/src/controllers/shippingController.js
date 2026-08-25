import { ShippingService } from '../services/shippingService.js';
import { Shipment } from '../models/Shipment.js';
import { CourierFactory } from '../integrations/couriers/CourierFactory.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getShipments = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const trackingStatus = req.query.status;

  const query = {};
  if (!req.branchScope.isGlobal && req.branchScope.branchId) {
    query.branchId = req.branchScope.branchId;
  }
  if (trackingStatus) query.trackingStatus = trackingStatus;

  const skip = (page - 1) * limit;
  const [total, shipments] = await Promise.all([
    Shipment.countDocuments(query),
    Shipment.find(query)
      .populate('orderId', 'orderNumber grandTotal deliveryAddress customerId status')
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return ApiResponse.paginated(res, shipments, { page, limit, total }, 'Shipments retrieved');
});

export const createShipment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const shipment = await ShippingService.createShipment(orderId, req.body, req.user, req);
  return ApiResponse.created(res, shipment, 'Shipment created and AWB generated');
});

export const dispatchShipment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const shipment = await ShippingService.dispatchShipment(id, req.user, req);
  return ApiResponse.success(res, shipment, 'Shipment dispatched');
});

export const getTracking = asyncHandler(async (req, res) => {
  const { awbNumber } = req.params;
  const timeline = await ShippingService.getTrackingTimeline(awbNumber);
  return ApiResponse.success(res, timeline, 'Tracking timeline retrieved');
});

export const addTrackingEvent = asyncHandler(async (req, res) => {
  const { awbNumber } = req.params;
  const event = await ShippingService.logTrackingEvent(awbNumber, req.body);
  return ApiResponse.created(res, event, 'Tracking event added');
});

export const getCourierProviders = asyncHandler(async (req, res) => {
  const providers = CourierFactory.listAvailableProviders();
  return ApiResponse.success(res, providers, 'Registered courier providers retrieved');
});
