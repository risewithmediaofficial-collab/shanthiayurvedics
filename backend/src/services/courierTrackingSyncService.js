import cron from 'node-cron';
import { Shipment } from '../models/Shipment.js';
import { Order } from '../models/Order.js';
import { TrackingEvent } from '../models/TrackingEvent.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { CourierFactory } from '../integrations/couriers/CourierFactory.js';
import { COURIER_PROVIDERS, SHIPPING_STATUS } from '../constants/shippingStates.js';
import { ORDER_STATUS } from '../constants/orderStates.js';
import { advanceOrderToDelivered } from './deliveryTransition.js';
import { OrderService } from './orderService.js';
import { emitToBranch, emitToUser } from '../sockets/index.js';
import { sendPushToUser } from './pushService.js';
import { logger } from '../config/logger.js';

export class CourierTrackingSyncService {
  /**
   * Helper to fetch or create a reliable system actor for audit & history
   */
  static async getSystemActor() {
    let systemUser = await User.findOne({ role: 'SUPER_ADMIN' }).lean();
    if (!systemUser) {
      systemUser = await User.findOne().lean();
    }
    return {
      _id: systemUser?._id,
      id: systemUser?._id,
      name: 'TPC Courier Auto-Sync',
      role: 'SYSTEM'
    };
  }

  /**
   * Synchronize all active, in-transit TPC shipments and orders
   */
  static async syncActiveShipments(triggeredBy = null, req = null) {
    const actor = triggeredBy || (await this.getSystemActor());
    const summary = {
      totalChecked: 0,
      deliveredCount: 0,
      outForDeliveryCount: 0,
      inTransitCount: 0,
      unchangedCount: 0,
      errors: []
    };

    try {
      // 1. Ensure any orders marked DISPATCHED/IN_TRANSIT with TPC tracking number have a linked Shipment record
      const activeTpcOrders = await Order.find({
        status: { $in: [ORDER_STATUS.DISPATCHED, ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.OUT_FOR_DELIVERY] },
        trackingNumber: { $exists: true, $ne: '' },
        courierName: { $regex: /professional|tpc/i }
      }).lean();

      for (const ord of activeTpcOrders) {
        const existing = await Shipment.findOne({ orderId: ord._id });
        if (!existing && ord.trackingNumber) {
          try {
            await Shipment.create({
              orderId: ord._id,
              branchId: ord.branchId,
              courierName: 'The Professional Courier (TPC)',
              carrierCode: COURIER_PROVIDERS.PROFESSIONAL_COURIER,
              awbNumber: ord.trackingNumber.trim().toUpperCase(),
              trackingStatus: ord.status === ORDER_STATUS.OUT_FOR_DELIVERY
                ? SHIPPING_STATUS.OUT_FOR_DELIVERY
                : SHIPPING_STATUS.IN_TRANSIT,
              bookingDate: ord.createdAt || new Date()
            });
          } catch (createErr) {
            logger.debug({ err: createErr.message, orderId: ord._id }, 'Shipment auto-link skipped');
          }
        }
      }

      // 2. Fetch all active shipments that need tracking updates
      const ACTIVE_STATUSES = [
        SHIPPING_STATUS.SHIPMENT_CREATED,
        SHIPPING_STATUS.PICKUP_SCHEDULED,
        SHIPPING_STATUS.PICKED_UP,
        SHIPPING_STATUS.IN_TRANSIT,
        SHIPPING_STATUS.OUT_FOR_DELIVERY
      ];

      const activeShipments = await Shipment.find({
        trackingStatus: { $in: ACTIVE_STATUSES },
        $or: [
          { carrierCode: COURIER_PROVIDERS.PROFESSIONAL_COURIER },
          { courierName: { $regex: /professional|tpc/i } }
        ]
      }).populate('orderId');

      summary.totalChecked = activeShipments.length;

      if (activeShipments.length === 0) {
        logger.info('📦 TPC Tracking Auto-Sync: No active in-transit shipments to track.');
        return summary;
      }

      logger.info({ count: activeShipments.length }, '🚚 Starting automated TPC courier tracking sync');

      const provider = CourierFactory.getProvider(COURIER_PROVIDERS.PROFESSIONAL_COURIER);

      for (const shipment of activeShipments) {
        try {
          if (!shipment.awbNumber) continue;

          const trackingResult = await provider.getTracking({ awbNumber: shipment.awbNumber });
          if (!trackingResult) continue;

          // Record new tracking events
          if (Array.isArray(trackingResult.events)) {
            for (const ev of trackingResult.events) {
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
          }

          const newStatus = trackingResult.status;
          const isDelivered = trackingResult.isDelivered || newStatus === SHIPPING_STATUS.DELIVERED;

          // Case A: Marked DELIVERED
          if (isDelivered && shipment.trackingStatus !== SHIPPING_STATUS.DELIVERED) {
            shipment.trackingStatus = SHIPPING_STATUS.DELIVERED;
            shipment.actualDeliveryDate = new Date();
            await shipment.save();

            const order = shipment.orderId;
            if (order && order._id) {
              await advanceOrderToDelivered(order._id, actor, req);

              // Notify assigned telecaller and branch
              const telecallerId = order.telecallerId?._id?.toString() || order.telecallerId?.toString();
              const customerName = order.patientDetails?.patientName || 'Customer';
              const orderNum = order.orderNumber || String(order._id);

              if (telecallerId) {
                await Notification.create({
                  userId: telecallerId,
                  branchId: order.branchId,
                  title: `📦 Order Delivered: #${orderNum}`,
                  message: `TPC Courier confirmed delivery of order #${orderNum} to ${customerName}.`,
                  type: 'ORDER_DELIVERED',
                  data: {
                    orderId: order._id,
                    orderNumber: orderNum,
                    awbNumber: shipment.awbNumber
                  }
                }).catch(() => {});

                emitToUser(telecallerId, 'order:delivered', {
                  orderId: order._id,
                  orderNumber: orderNum,
                  awbNumber: shipment.awbNumber
                });

                sendPushToUser(telecallerId, {
                  title: `📦 Order Delivered: #${orderNum}`,
                  body: `TPC delivered parcel (${shipment.awbNumber}) to ${customerName}.`,
                  link: `/orders/${order._id}`,
                  tag: `order-delivered-${order._id}`
                }).catch(() => {});
              }
            }

            emitToBranch(shipment.branchId?.toString?.() || null, 'shipment:status_changed', {
              shipmentId: shipment._id,
              awbNumber: shipment.awbNumber,
              status: SHIPPING_STATUS.DELIVERED
            });

            summary.deliveredCount++;
            logger.info({ awb: shipment.awbNumber, orderNumber: shipment.orderId?.orderNumber }, '✅ TPC Auto-Sync: Marked shipment & order as DELIVERED');
          }
          // Case B: OUT_FOR_DELIVERY
          else if (newStatus === SHIPPING_STATUS.OUT_FOR_DELIVERY && shipment.trackingStatus !== SHIPPING_STATUS.OUT_FOR_DELIVERY) {
            shipment.trackingStatus = SHIPPING_STATUS.OUT_FOR_DELIVERY;
            await shipment.save();

            const order = shipment.orderId;
            if (order && (order.status === ORDER_STATUS.DISPATCHED || order.status === ORDER_STATUS.IN_TRANSIT)) {
              if (order.status === ORDER_STATUS.DISPATCHED) {
                await OrderService.transitionStatus(order._id, ORDER_STATUS.IN_TRANSIT, {
                  changedBy: actor,
                  notes: 'In transit to delivery station',
                  req
                });
              }
              await OrderService.transitionStatus(order._id, ORDER_STATUS.OUT_FOR_DELIVERY, {
                changedBy: actor,
                notes: 'Courier out for delivery',
                req
              });
            }

            emitToBranch(shipment.branchId?.toString?.() || null, 'shipment:status_changed', {
              shipmentId: shipment._id,
              awbNumber: shipment.awbNumber,
              status: SHIPPING_STATUS.OUT_FOR_DELIVERY
            });

            summary.outForDeliveryCount++;
          }
          // Case C: IN_TRANSIT
          else if (newStatus === SHIPPING_STATUS.IN_TRANSIT && shipment.trackingStatus === SHIPPING_STATUS.SHIPMENT_CREATED) {
            shipment.trackingStatus = SHIPPING_STATUS.IN_TRANSIT;
            await shipment.save();

            const order = shipment.orderId;
            if (order && order.status === ORDER_STATUS.DISPATCHED) {
              await OrderService.transitionStatus(order._id, ORDER_STATUS.IN_TRANSIT, {
                changedBy: actor,
                notes: 'Parcel picked up and in transit',
                req
              });
            }

            emitToBranch(shipment.branchId?.toString?.() || null, 'shipment:status_changed', {
              shipmentId: shipment._id,
              awbNumber: shipment.awbNumber,
              status: SHIPPING_STATUS.IN_TRANSIT
            });

            summary.inTransitCount++;
          } else {
            summary.unchangedCount++;
          }

          // Polite pacing: 250ms delay between courier API calls
          await new Promise((r) => setTimeout(r, 250));
        } catch (itemErr) {
          logger.warn({ err: itemErr.message, awb: shipment.awbNumber }, 'Error tracking individual TPC shipment');
          summary.errors.push({ awb: shipment.awbNumber, error: itemErr.message });
        }
      }

      logger.info(summary, '🚚 Finished automated TPC courier tracking sync cycle');
      return summary;
    } catch (err) {
      logger.error({ err }, 'Fatal error during TPC tracking sync cycle');
      summary.errors.push({ error: err.message });
      return summary;
    }
  }

  /**
   * Initialize 1-hour recurring scheduler and initial startup sync
   */
  static initScheduler() {
    // Initial sync after 30 seconds to allow complete DB initialization
    setTimeout(() => {
      this.syncActiveShipments().catch((err) => {
        logger.warn({ err }, 'Initial boot TPC tracking sync error');
      });
    }, 30000);

    // Schedule hourly recurring sync at minute 30 of every hour ('30 * * * *')
    // Offset from NotificationScheduler (which runs at '0 * * * *') to balance CPU and DB load
    const hourlyTask = cron.schedule('30 * * * *', () => {
      this.syncActiveShipments().catch((err) => {
        logger.warn({ err }, 'Hourly cron TPC tracking sync error');
      });
    });

    logger.info('🚚 Hourly TPC Courier Tracking Auto-Sync initialized (runs every 1 hour at XX:30)');
    return hourlyTask;
  }
}

export default CourierTrackingSyncService;
