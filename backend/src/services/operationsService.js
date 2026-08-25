import { Order } from '../models/Order.js';
import { PackingRecord } from '../models/PackingRecord.js';
import { OrderService } from './orderService.js';
import { ORDER_STATUS } from '../constants/orderStates.js';
import { NotFoundError, AppError } from '../utils/errors.js';
import { AuditService } from './auditService.js';

export class OperationsService {
  /**
   * Pack an Order and record physical parcel metrics
   */
  static async packOrder(orderId, packingData, user, req) {
    const order = await Order.findById(orderId);
    if (!order) throw new NotFoundError('Order');

    if (
      order.status !== ORDER_STATUS.NEW &&
      order.status !== ORDER_STATUS.CONFIRMED &&
      order.status !== ORDER_STATUS.PROCESSING &&
      order.status !== ORDER_STATUS.READY_FOR_PACKING &&
      order.status !== ORDER_STATUS.PACKED
    ) {
      throw new AppError(`Order cannot be packed in current status '${order.status}'`, 400);
    }

    const {
      weightGrams = 450,
      dimensions = { lengthCm: 20, widthCm: 15, heightCm: 10 },
      boxType = 'Standard Corrugated Box',
      sealNumber,
      notes
    } = packingData;

    // Create or update packing record
    const packingRecord = await PackingRecord.findOneAndUpdate(
      { orderId: order._id },
      {
        orderId: order._id,
        branchId: order.branchId,
        packedBy: user.id || user._id,
        packedAt: new Date(),
        packageDetails: {
          boxType,
          itemsCount: order.items.reduce((acc, i) => acc + i.quantity, 0),
          sealNumber
        },
        weightGrams,
        dimensions,
        packingStatus: 'PACKED',
        notes
      },
      { upsert: true, new: true }
    );

    // Step through the state machine sequentially
    if (order.status === ORDER_STATUS.NEW) {
      await OrderService.transitionStatus(order._id, ORDER_STATUS.CONFIRMED, {
        changedBy: user,
        notes: 'Verified and confirmed on packing desk',
        req
      });
      order.status = ORDER_STATUS.CONFIRMED;
    }
    if (order.status === ORDER_STATUS.CONFIRMED) {
      await OrderService.transitionStatus(order._id, ORDER_STATUS.PROCESSING, {
        changedBy: user,
        notes: 'Processing at packing station',
        req
      });
      order.status = ORDER_STATUS.PROCESSING;
    }
    if (order.status === ORDER_STATUS.PROCESSING) {
      await OrderService.transitionStatus(order._id, ORDER_STATUS.READY_FOR_PACKING, {
        changedBy: user,
        notes: 'Staged at packing station',
        req
      });
      order.status = ORDER_STATUS.READY_FOR_PACKING;
    }

    // Transition to PACKED
    const updatedOrder = await OrderService.transitionStatus(order._id, ORDER_STATUS.PACKED, {
      changedBy: user,
      notes: `Packed by ${user.name || 'Manager'}. Weight: ${weightGrams}g. Box: ${boxType}`,
      req
    });

    await AuditService.log({
      userId: user.id || user._id,
      branchId: order.branchId,
      action: 'ORDER_PACKED',
      module: 'operations',
      resourceType: 'PackingRecord',
      resourceId: packingRecord._id,
      newValue: { orderId: order._id, weightGrams, boxType },
      req
    });

    return { order: updatedOrder, packingRecord };
  }

  /**
   * Get Operations Dashboard & Operational Queues summary
   */
  static async getOperationsSummary(branchId) {
    const scope = branchId && branchId !== 'ALL' ? { branchId } : {};

    const [
      pendingVerification,
      inProcessing,
      readyForPacking,
      packed,
      readyForDispatch,
      dispatched,
      delivered,
      rtoCount
    ] = await Promise.all([
      Order.countDocuments({ ...scope, status: ORDER_STATUS.NEW }),
      Order.countDocuments({ ...scope, status: ORDER_STATUS.PROCESSING }),
      Order.countDocuments({ ...scope, status: ORDER_STATUS.READY_FOR_PACKING }),
      Order.countDocuments({ ...scope, status: ORDER_STATUS.PACKED }),
      Order.countDocuments({ ...scope, status: ORDER_STATUS.READY_FOR_DISPATCH }),
      Order.countDocuments({ ...scope, status: ORDER_STATUS.DISPATCHED }),
      Order.countDocuments({ ...scope, status: ORDER_STATUS.DELIVERED }),
      Order.countDocuments({ ...scope, status: ORDER_STATUS.RTO })
    ]);

    return {
      pendingVerification,
      inProcessing,
      readyForPacking,
      packed,
      readyForDispatch,
      dispatched,
      delivered,
      rtoCount
    };
  }
}

export default OperationsService;
