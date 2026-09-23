import { RTORecord } from '../models/RTORecord.js';
import { Order } from '../models/Order.js';
import { Shipment } from '../models/Shipment.js';
import { Inventory } from '../models/Inventory.js';
import { StockMovement } from '../models/StockMovement.js';
import { InventoryService } from './inventoryService.js';
import { OrderService } from './orderService.js';
import { ORDER_STATUS } from '../constants/orderStates.js';
import { RTO_REASONS, RTO_CONDITION } from '../constants/shippingStates.js';
import { MOVEMENT_TYPES, MOVEMENT_REASONS } from '../constants/stockStates.js';
import { NotFoundError, AppError } from '../utils/errors.js';
import { AuditService } from './auditService.js';

export class RTOService {
  /**
   * Initiate RTO upon Delivery Failure
   */
  static async initiateRTO({ orderId, reason = RTO_REASONS.CUSTOMER_REFUSED, returnAwbNumber, notes }, user, req) {
    const order = await Order.findById(orderId);
    if (!order) throw new NotFoundError('Order');

    const shipment = await Shipment.findOne({ orderId: order._id });

    // Transition order to RTO or DELIVERY_FAILED
    const previousStatus = order.status;
    order.status = ORDER_STATUS.RTO;
    order.statusHistory.push({
      fromStatus: previousStatus,
      toStatus: ORDER_STATUS.RTO,
      changedBy: user.id || user._id,
      timestamp: new Date(),
      notes: `RTO Initiated. Reason: ${reason}. Notes: ${notes || 'N/A'}`
    });
    await order.save();

    const rtoRecord = new RTORecord({
      orderId: order._id,
      shipmentId: shipment?._id || null,
      branchId: order.branchId,
      reason,
      returnAwbNumber: returnAwbNumber || shipment?.awbNumber || `RTO-${Date.now().toString().slice(-6)}`,
      status: 'RTO_INITIATED',
      condition: RTO_CONDITION.PENDING_VERIFICATION,
      notes
    });
    await rtoRecord.save();

    await AuditService.log({
      userId: user.id || user._id,
      branchId: order.branchId,
      action: 'RTO_INITIATED',
      module: 'rto',
      resourceType: 'RTORecord',
      resourceId: rtoRecord._id,
      newValue: { orderId: order._id, reason },
      req
    });

    return rtoRecord;
  }

  /**
   * Mark RTO Package Received physically at Branch
   */
  static async markRTOReceived(rtoId, user, req) {
    const rto = await RTORecord.findById(rtoId).populate('orderId');
    if (!rto) throw new NotFoundError('RTORecord');

    rto.status = 'RECEIVED_AT_BRANCH';
    rto.receivedAt = new Date();
    rto.receivedBy = user.id || user._id;
    await rto.save();

    return rto;
  }

  /**
   * Manager Condition Verification & Inventory Recovery
   * SALEABLE -> Restocked to available stock
   * DAMAGED -> Recorded as damaged stock
   * MISSING -> Discrepancy recorded
   */
  static async verifyAndRecoverStock(rtoId, { condition, itemsCondition = [], notes }, user, req) {
    const rto = await RTORecord.findById(rtoId).populate('orderId');
    if (!rto) throw new NotFoundError('RTORecord');

    const order = rto.orderId;
    if (!order) throw new NotFoundError('Associated Order');

    rto.status = 'VERIFIED';
    rto.condition = condition;
    rto.verifiedAt = new Date();
    rto.verifiedBy = user.id || user._id;
    rto.notes = notes;

    const restockedList = [];

    // Process each item in the order
    for (const item of order.items) {
      const specificCondition = itemsCondition.find(
        (ic) => ic.productId?.toString() === item.productId.toString()
      )?.condition || condition;

      const inv = await InventoryService.getOrCreateInventory(
        item.productId,
        item.batchId,
        order.branchId
      );

      if (specificCondition === RTO_CONDITION.SALEABLE) {
        // Restock to available stock
        const previousAvailable = inv.availableQuantity;
        inv.availableQuantity += item.quantity;
        inv.returnedQuantity = (inv.returnedQuantity || 0) + item.quantity;
        await inv.save();

        await StockMovement.create({
          productId: item.productId,
          batchId: item.batchId,
          branchId: order.branchId,
          type: MOVEMENT_TYPES.RETURN,
          quantity: item.quantity,
          reason: MOVEMENT_REASONS.RTO_RETURN,
          referenceType: 'RTORecord',
          referenceId: rto._id.toString(),
          performedBy: user.id || user._id,
          previousAvailable,
          newAvailable: inv.availableQuantity,
          notes: `RTO Saleable Restock from Order ${order.orderNumber}`
        });

        restockedList.push({
          productId: item.productId,
          batchId: item.batchId,
          quantity: item.quantity,
          condition: RTO_CONDITION.SALEABLE
        });
      } else if (specificCondition === RTO_CONDITION.DAMAGED) {
        // Mark as damaged stock
        inv.damagedQuantity = (inv.damagedQuantity || 0) + item.quantity;
        await inv.save();

        await StockMovement.create({
          productId: item.productId,
          batchId: item.batchId,
          branchId: order.branchId,
          type: MOVEMENT_TYPES.DAMAGE,
          quantity: item.quantity,
          reason: MOVEMENT_REASONS.DAMAGED,
          referenceType: 'RTORecord',
          referenceId: rto._id.toString(),
          performedBy: user.id || user._id,
          previousAvailable: inv.availableQuantity,
          newAvailable: inv.availableQuantity,
          notes: `RTO Damaged Goods recorded from Order ${order.orderNumber}`
        });

        restockedList.push({
          productId: item.productId,
          batchId: item.batchId,
          quantity: item.quantity,
          condition: RTO_CONDITION.DAMAGED
        });
      }
    }

    rto.restockedItems = restockedList;
    await rto.save();

    await AuditService.log({
      userId: user.id || user._id,
      branchId: order.branchId,
      action: 'RTO_VERIFIED_AND_RECOVERED',
      module: 'rto',
      resourceType: 'RTORecord',
      resourceId: rto._id,
      newValue: { condition, restockedList },
      req
    });

    return rto;
  }
}

export default RTOService;
