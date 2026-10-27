import { Order } from '../models/Order.js';
import { ORDER_STATUS } from '../constants/orderStates.js';
import { AppError, NotFoundError } from '../utils/errors.js';
import { OrderService } from './orderService.js';

import { Shipment } from '../models/Shipment.js';

export async function advanceOrderToDelivered(orderId, actor, req) {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order');

  let effectiveAwb = (order.trackingNumber || '').trim();
  if (!effectiveAwb || effectiveAwb.toUpperCase() === 'PENDING') {
    const linkedShipment = await Shipment.findOne({ orderId }).select('awbNumber').lean();
    if (linkedShipment?.awbNumber) {
      effectiveAwb = linkedShipment.awbNumber;
      order.trackingNumber = effectiveAwb;
      await order.save();
    }
  }

  const path = {
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.DISPATCHED, ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.DISPATCHED, ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.READY_FOR_PACKING]: [ORDER_STATUS.DISPATCHED, ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.PACKED]: [ORDER_STATUS.DISPATCHED, ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.READY_FOR_DISPATCH]: [ORDER_STATUS.DISPATCHED, ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.DISPATCHED]: [ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.IN_TRANSIT]: [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.DELIVERY_FAILED]: [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.DELIVERED]: []
  }[order.status];
  if (!path) throw new AppError(`Order cannot be marked delivered from ${order.status}`, 409);
  for (const status of path) {
    await OrderService.transitionStatus(orderId, status, {
      changedBy: actor,
      notes: 'Courier confirmed delivery',
      trackingNumber: effectiveAwb,
      req
    });
  }
}
