import { Shipment } from '../models/Shipment.js';
import { TrackingEvent } from '../models/TrackingEvent.js';
import { Order } from '../models/Order.js';
import { OrderService } from './orderService.js';
import { CourierFactory } from '../integrations/couriers/CourierFactory.js';
import { ORDER_STATUS } from '../constants/orderStates.js';
import { SHIPPING_STATUS } from '../constants/shippingStates.js';
import { NotFoundError, AppError } from '../utils/errors.js';
import { AuditService } from './auditService.js';

export class ShippingService {
  /**
   * Create Shipment and Generate AWB
   */
  static async createShipment(orderId, { carrierCode = 'INDIA_POST', shippingCharge = 50 }, user, req) {
    const order = await Order.findById(orderId).populate('branchId', 'code name');
    if (!order) throw new NotFoundError('Order');

    if (order.status !== ORDER_STATUS.PACKED && order.status !== ORDER_STATUS.READY_FOR_DISPATCH) {
      throw new AppError(`Cannot create shipment for order in '${order.status}' status. Order must be PACKED.`, 400);
    }

    const provider = CourierFactory.getProvider(carrierCode);
    const awbResult = await provider.generateAWB({
      orderNumber: order.orderNumber,
      branchCode: order.branchId?.code || 'HSR'
    });

    const shipment = new Shipment({
      orderId: order._id,
      branchId: order.branchId?._id || order.branchId,
      courierName: provider.name,
      awbNumber: awbResult.awbNumber,
      shippingCharge,
      bookingDate: new Date(),
      trackingStatus: SHIPPING_STATUS.SHIPMENT_CREATED
    });
    await shipment.save();

    // Initial Tracking Event
    await TrackingEvent.create({
      shipmentId: shipment._id,
      awbNumber: shipment.awbNumber,
      status: SHIPPING_STATUS.SHIPMENT_CREATED,
      location: `${order.branchId?.name || 'Hosur'} Dispatch Desk`,
      activity: `Shipment booked with ${provider.name}. AWB generated: ${shipment.awbNumber}`,
      timestamp: new Date()
    });

    if (order.status === ORDER_STATUS.PACKED) {
      await OrderService.transitionStatus(order._id, ORDER_STATUS.READY_FOR_DISPATCH, {
        changedBy: user,
        notes: `AWB ${shipment.awbNumber} generated with ${provider.name}`,
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
      newValue: { awbNumber: shipment.awbNumber, carrier: provider.name },
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

    shipment.dispatchedDate = new Date();
    shipment.trackingStatus = SHIPPING_STATUS.PICKED_UP;
    await shipment.save();

    // Add tracking event
    await TrackingEvent.create({
      shipmentId: shipment._id,
      awbNumber: shipment.awbNumber,
      status: SHIPPING_STATUS.PICKED_UP,
      location: 'Branch Logistics Desk',
      activity: 'Parcel handed over to courier pickup executive',
      timestamp: new Date()
    });

    // Update Order Status to DISPATCHED
    await OrderService.transitionStatus(shipment.orderId, ORDER_STATUS.DISPATCHED, {
      changedBy: user,
      notes: `Dispatched via ${shipment.courierName}. AWB: ${shipment.awbNumber}`,
      req
    });

    return shipment;
  }

  /**
   * Get Tracking Timeline
   */
  static async getTrackingTimeline(awbNumber) {
    const shipment = await Shipment.findOne({ awbNumber })
      .populate('orderId', 'orderNumber grandTotal deliveryAddress')
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
  static async logTrackingEvent(awbNumber, { status, location, activity }) {
    const shipment = await Shipment.findOne({ awbNumber });
    if (!shipment) throw new NotFoundError('Shipment');

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

    // If delivered, update order status
    if (status === SHIPPING_STATUS.DELIVERED) {
      const order = await Order.findById(shipment.orderId);
      if (order && order.status !== ORDER_STATUS.DELIVERED) {
        order.status = ORDER_STATUS.DELIVERED;
        order.paymentStatus = 'PAID';
        order.statusHistory.push({
          fromStatus: ORDER_STATUS.DISPATCHED,
          toStatus: ORDER_STATUS.DELIVERED,
          timestamp: new Date(),
          notes: 'Delivered to customer'
        });
        await order.save();
      }
    }

    return event;
  }
}

export default ShippingService;
