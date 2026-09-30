import { ShippingService } from '../services/shippingService.js';
import { Shipment } from '../models/Shipment.js';
import { CourierFactory } from '../integrations/couriers/CourierFactory.js';
import { processImportFile } from '../services/courierImportService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { recordScope } from '../utils/recordScope.js';
import { NotFoundError } from '../utils/errors.js';
import { pagination, escapeSearch, dateRange } from '../utils/queryHelpers.js';

export const getShipments = asyncHandler(async (req, res) => {
  const { page, limit, isExport } = pagination(req.query);
  const trackingStatus = req.query.status;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const search = req.query.search?.trim();

  const query = {};
  if (!req.branchScope.isGlobal && req.branchScope.branchId) {
    query.branchId = req.branchScope.branchId;
  }
  if (trackingStatus) query.trackingStatus = trackingStatus;

  if (startDate || endDate) {
    query.createdAt = dateRange(startDate, endDate);
  }

  if (search) {
    query.$or = [
      { awbNumber: { $regex: escapeSearch(search), $options: 'i' } },
      { courierName: { $regex: escapeSearch(search), $options: 'i' } }
    ];
  }

  const skip = isExport ? 0 : (page - 1) * limit;
  const [total, shipments] = await Promise.all([
    Shipment.countDocuments(query),
    Shipment.find(query)
      .populate({
        path: 'orderId',
        select: 'orderNumber grandTotal deliveryAddress customerId status',
        populate: { path: 'customerId', select: 'name mobile' }
      })
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
  const authorizedShipment = await Shipment.exists({ awbNumber, ...recordScope(req.user, req) });
  if (!authorizedShipment) throw new NotFoundError('Shipment');
  const event = await ShippingService.logTrackingEvent(awbNumber, req.body, req.user, req);
  return ApiResponse.created(res, event, 'Tracking event added');
});

export const getCourierProviders = asyncHandler(async (req, res) => {
  const providers = CourierFactory.listAvailableProviders();
  return ApiResponse.success(res, providers, 'Registered courier providers retrieved');
});

export const importCourierStatus = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ApiResponse.error(res, 'No file uploaded. Please upload an Excel (.xlsx/.xls/.csv) or PDF file.', 400);
  }

  // courier is optional body field: 'INDIA_POST' | 'PROFESSIONAL_COURIER' | 'AUTO'
  const courier = req.body?.courier || 'AUTO';

  const summary = await processImportFile(
    req.file.buffer,
    req.file.mimetype,
    req.file.originalname,
    courier,
    req.user,
    req.branchScope
  );

  return ApiResponse.success(res, summary, `Import complete. ${summary.updated} shipment(s) updated.`);
});
