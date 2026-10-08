import { Shipment } from '../models/Shipment.js';
import { TrackingEvent } from '../models/TrackingEvent.js';
import { Order } from '../models/Order.js';
import { OrderService } from './orderService.js';
import { CourierFactory } from '../integrations/couriers/CourierFactory.js';
import { ORDER_STATUS } from '../constants/orderStates.js';
import { SHIPPING_STATUS, COURIER_PROVIDERS } from '../constants/shippingStates.js';
import { NotFoundError, AppError } from '../utils/errors.js';
import { AuditService } from './auditService.js';
import { advanceOrderToDelivered } from './deliveryTransition.js';

export class ShippingService {
  /**
   * Get Shipment by Order ID
   */
  static async getShipmentForOrder(orderId) {
    const shipment = await Shipment.findOne({ orderId })
      .populate('branchId', 'name code')
      .populate('orderId', 'orderNumber grandTotal status paymentStatus paymentMethod deliveryAddress patientDetails')
      .lean();

    if (!shipment) return null;

    const events = await TrackingEvent.find({ shipmentId: shipment._id })
      .sort({ timestamp: -1 })
      .lean();

    return {
      shipment,
      events
    };
  }

  /**
   * Check Serviceability for a PIN code with a specific carrier
   */
  static async checkServiceability({ carrierCode = COURIER_PROVIDERS.PROFESSIONAL_COURIER, pincode }) {
    const provider = CourierFactory.getProvider(carrierCode);
    return provider.checkServiceability({ pincode });
  }

  /**
   * Check Consignment Note Stock (for TPC)
   */
  static async checkStock({ carrierCode = COURIER_PROVIDERS.PROFESSIONAL_COURIER }) {
    const provider = CourierFactory.getProvider(carrierCode);
    if (typeof provider.checkStock === 'function') {
      return provider.checkStock();
    }
    return { availableCnotes: 'Unlimited', status: 'OK', isMock: false };
  }

  /**
   * Create Shipment and Generate AWB (with duplicate guard & TPC support)
   */
  static async createShipment(orderId, payload = {}, user, req) {
    const {
      carrierCode = COURIER_PROVIDERS.INDIA_POST,
      shippingCharge = 50,
      weight = 0.5,
      pieces = 1,
      length = 15,
      width = 12,
      height = 10
    } = payload;

    const order = await Order.findById(orderId)
      .populate('branchId', 'code name')
      .populate('customerId', 'name mobile email');

    if (!order) throw new NotFoundError('Order');

    // Duplicate booking check: prevent multiple active shipments for the same order
    const existingShipment = await Shipment.findOne({
      orderId: order._id,
      trackingStatus: { $ne: SHIPPING_STATUS.CANCELLED }
    });
    if (existingShipment) {
      throw new AppError(
        `A shipment is already booked for this order with AWB ${existingShipment.awbNumber}. Duplicate booking prevented.`,
        400
      );
    }

    if (order.status !== ORDER_STATUS.PACKED && order.status !== ORDER_STATUS.READY_FOR_DISPATCH) {
      throw new AppError(
        `Cannot create shipment for order in '${order.status}' status. Order must be PACKED or READY_FOR_DISPATCH.`,
        400
      );
    }

    const provider = CourierFactory.getProvider(carrierCode);
    const packageDetails = {
      weight: Number(weight) || 0.5,
      pieces: Number(pieces) || 1,
      length: Number(length) || 15,
      width: Number(width) || 12,
      height: Number(height) || 10
    };

    let awbNumber = '';
    let isMock = false;
    let tpcData = null;

    if (carrierCode === COURIER_PROVIDERS.PROFESSIONAL_COURIER) {
      const isCod = order.paymentMethod === 'COD';
      const bookingResult = await provider.bookShipment({
        order,
        packageDetails,
        isCod
      });
      awbNumber = bookingResult.awbNumber;
      isMock = Boolean(bookingResult.isMock);
      tpcData = {
        refNo: bookingResult.refNo || order.orderNumber,
        podNo: bookingResult.podNo || awbNumber,
        cnoteNo: bookingResult.cnoteNo || awbNumber,
        transMode: bookingResult.mode || 'ST',
        serviceType: bookingResult.service || 'STD',
        rawResponse: bookingResult.rawResponse
      };
    } else {
      const awbResult = await provider.generateAWB({
        orderNumber: order.orderNumber,
        branchCode: order.branchId?.code || 'HSR',
        order
      });
      awbNumber = awbResult.awbNumber;
      isMock = false;
    }

    const shipment = new Shipment({
      orderId: order._id,
      branchId: order.branchId?._id || order.branchId,
      courierName: provider.name,
      carrierCode,
      awbNumber,
      isMock,
      shippingCharge,
      bookingDate: new Date(),
      trackingStatus: SHIPPING_STATUS.SHIPMENT_CREATED,
      packageDetails,
      tpcDetails: tpcData || undefined
    });
    await shipment.save();

    // Initial Tracking Event
    await TrackingEvent.create({
      shipmentId: shipment._id,
      awbNumber: shipment.awbNumber,
      status: SHIPPING_STATUS.SHIPMENT_CREATED,
      location: `${order.branchId?.name || 'Hosur'} Dispatch Desk`,
      activity: `Shipment booked with ${provider.name}. AWB generated: ${shipment.awbNumber} ${isMock ? '[DEMO MODE]' : ''}`.trim(),
      timestamp: new Date()
    });

    if (order.status === ORDER_STATUS.PACKED) {
      await OrderService.transitionStatus(order._id, ORDER_STATUS.READY_FOR_DISPATCH, {
        changedBy: user,
        notes: `AWB ${shipment.awbNumber} generated with ${provider.name}${isMock ? ' (Demo Mode)' : ''}`,
        req
      });
    }

    await AuditService.log({
      userId: user.id || user._id,
      branchId: order.branchId,
      action: 'SHIPMENT_CREATED',
      module: 'shipping',
      resourceType: 'Shipment',
      resourceId: shipment._id,
      newValue: { awbNumber: shipment.awbNumber, carrier: provider.name, isMock },
      req
    });

    return shipment;
  }

  /**
   * Dispatch Order (Hands parcel to courier van)
   */
  static async dispatchShipment(shipmentId, user, req) {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) throw new NotFoundError('Shipment');
    if (shipment.trackingStatus === SHIPPING_STATUS.PICKED_UP) return shipment;

    await OrderService.transitionStatus(shipment.orderId, ORDER_STATUS.DISPATCHED, {
      changedBy: user,
      notes: `Dispatched via ${shipment.courierName}. AWB: ${shipment.awbNumber}`,
      req
    });

    shipment.dispatchedDate = new Date();
    shipment.trackingStatus = SHIPPING_STATUS.PICKED_UP;
    await shipment.save();

    await TrackingEvent.create({
      shipmentId: shipment._id,
      awbNumber: shipment.awbNumber,
      status: SHIPPING_STATUS.PICKED_UP,
      location: 'Branch Logistics Desk',
      activity: 'Parcel handed over to courier pickup executive',
      timestamp: new Date()
    });

    return shipment;
  }

  /**
   * Get Tracking Timeline
   */
  static async getTrackingTimeline(awbNumber) {
    const shipment = await Shipment.findOne({ awbNumber })
      .populate('branchId', 'name code')
      .lean();

    if (!shipment) throw new NotFoundError('Shipment AWB');

    const events = await TrackingEvent.find({ shipmentId: shipment._id })
      .sort({ timestamp: -1 })
      .lean();

    return {
      shipment,
      events
    };
  }

  /**
   * Append Tracking Event / Update Status
   */
  static async logTrackingEvent(awbNumber, { status, location, activity }, actor, req) {
    const shipment = await Shipment.findOne({ awbNumber });
    if (!shipment) throw new NotFoundError('Shipment');

    if (status === SHIPPING_STATUS.DELIVERED) {
      await advanceOrderToDelivered(shipment.orderId, actor, req);
    }

    shipment.trackingStatus = status;
    if (status === SHIPPING_STATUS.DELIVERED) {
      shipment.actualDeliveryDate = new Date();
    }
    await shipment.save();

    const event = new TrackingEvent({
      shipmentId: shipment._id,
      awbNumber,
      status,
      location: location || 'Transit Hub',
      activity,
      timestamp: new Date()
    });
    await event.save();

    return event;
  }

  /**
   * Synchronize Tracking status directly from courier API
   */
  static async syncTracking(shipmentId, actor, req) {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) throw new NotFoundError('Shipment');

    const provider = CourierFactory.getProvider(shipment.carrierCode || COURIER_PROVIDERS.INDIA_POST);
    const trackingResult = await provider.getTracking({ awbNumber: shipment.awbNumber });

    if (trackingResult && Array.isArray(trackingResult.events)) {
      for (const ev of trackingResult.events) {
        // Prevent duplicate events
        const exists = await TrackingEvent.findOne({
          shipmentId: shipment._id,
          activity: ev.activity
        });

        if (!exists) {
          await TrackingEvent.create({
            shipmentId: shipment._id,
            awbNumber: shipment.awbNumber,
            status: ev.status,
            location: ev.location,
            activity: ev.activity,
            timestamp: ev.timestamp || new Date()
          });
        }
      }

      if (trackingResult.status && trackingResult.status !== shipment.trackingStatus) {
        shipment.trackingStatus = trackingResult.status;
        if (trackingResult.status === SHIPPING_STATUS.DELIVERED) {
          shipment.actualDeliveryDate = new Date();
          await advanceOrderToDelivered(shipment.orderId, actor, req);
        }
        await shipment.save();
      }
    }

    const updatedEvents = await TrackingEvent.find({ shipmentId: shipment._id })
      .sort({ timestamp: -1 })
      .lean();

    return {
      shipment,
      events: updatedEvents,
      syncResult: trackingResult
    };
  }

  /**
   * Cancel Shipment
   */
  static async cancelShipment(shipmentId, { reason = 'Cancelled by staff' } = {}, actor, req) {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) throw new NotFoundError('Shipment');

    if (shipment.trackingStatus === SHIPPING_STATUS.DELIVERED) {
      throw new AppError('Cannot cancel a shipment that has already been delivered.', 400);
    }
    if (shipment.trackingStatus === SHIPPING_STATUS.CANCELLED || shipment.cancellation?.isCancelled) {
      throw new AppError('Shipment is already cancelled.', 400);
    }

    const provider = CourierFactory.getProvider(shipment.carrierCode || COURIER_PROVIDERS.INDIA_POST);
    let cancelResponse = null;
    if (typeof provider.cancelShipment === 'function') {
      cancelResponse = await provider.cancelShipment({ awbNumber: shipment.awbNumber, reason });
    }

    shipment.trackingStatus = SHIPPING_STATUS.CANCELLED;
    shipment.cancellation = {
      isCancelled: true,
      cancelledAt: new Date(),
      cancelledBy: actor._id || actor.id,
      reason
    };
    await shipment.save();

    await TrackingEvent.create({
      shipmentId: shipment._id,
      awbNumber: shipment.awbNumber,
      status: SHIPPING_STATUS.CANCELLED,
      location: 'Logistics Desk',
      activity: `Consignment booking cancelled (${reason})`,
      timestamp: new Date()
    });

    await AuditService.log({
      userId: actor._id || actor.id,
      branchId: shipment.branchId,
      action: 'SHIPMENT_CANCELLED',
      module: 'shipping',
      resourceType: 'Shipment',
      resourceId: shipment._id,
      newValue: { awbNumber: shipment.awbNumber, reason },
      req
    });

    return {
      shipment,
      cancelResponse
    };
  }

  /**
   * Get Shipping Label
   */
  static async getShippingLabel(shipmentId, { singleCopy = true } = {}) {
    const shipment = await Shipment.findById(shipmentId)
      .populate({
        path: 'orderId',
        select: 'orderNumber grandTotal paymentMethod deliveryAddress patientDetails customerId',
        populate: { path: 'customerId', select: 'name mobile email' }
      })
      .populate('branchId', 'name code');

    if (!shipment) throw new NotFoundError('Shipment');

    const provider = CourierFactory.getProvider(shipment.carrierCode || COURIER_PROVIDERS.INDIA_POST);
    if (typeof provider.getLabel === 'function') {
      return provider.getLabel({
        awbNumber: shipment.awbNumber,
        singleCopy,
        shipment
      });
    }

    return {
      awbNumber: shipment.awbNumber,
      message: 'Label generation not available for this carrier',
      isMock: false
    };
  }
}

export default ShippingService;
