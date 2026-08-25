import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { OrderStatusHistory } from '../models/OrderStatusHistory.js';
import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';
import { ProductBatch } from '../models/ProductBatch.js';
import { InventoryService } from './inventoryService.js';
import { StateMachineService } from './stateMachineService.js';
import { AuditService } from './auditService.js';
import { withTransaction } from '../utils/transactionHelper.js';
import { ORDER_STATUS } from '../constants/orderStates.js';
import { NotFoundError, AppError } from '../utils/errors.js';
import { emitToBranch, emitToUser } from '../sockets/index.js';

export class OrderService {
  /**
   * Create an Order with MongoDB Transaction and Stock Reservation
   */
  static async createOrder(orderData, user, req) {
    const {
      customerId,
      branchId = user.branchId,
      items = [],
      paymentMethod = 'COD',
      deliveryAddress,
      notes
    } = orderData;

    let targetCustomerId = customerId;
    let customer = null;

    if (targetCustomerId) {
      customer = await Customer.findById(targetCustomerId);
    } else if (orderData.patientName && orderData.mobile) {
      // Find existing customer by mobile or create new customer on the fly
      customer = await Customer.findOne({ mobile: orderData.mobile.trim() });
      if (!customer) {
        customer = await Customer.create({
          name: orderData.patientName.trim(),
          fatherName: orderData.fatherName?.trim(),
          mobile: orderData.mobile.trim(),
          altMobile: orderData.altMobile?.trim(),
          branchId,
          assignedTelecallerId: user.id || user._id,
          isAppRegistered: Boolean(orderData.patientAppRegistered),
          addresses: [
            {
              street: deliveryAddress?.street || 'Main Street',
              landmark: deliveryAddress?.landmark || '',
              city: deliveryAddress?.city || 'Hosur',
              state: deliveryAddress?.state || 'Tamil Nadu',
              pincode: deliveryAddress?.pincode || '635109'
            }
          ]
        });
      }
      targetCustomerId = customer._id;
    }

    if (!customer) {
      throw new NotFoundError('Customer or Patient details');
    }

    // Generate unique order number (e.g. ORD-20260825-9831)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

    // Use withTransaction for atomic stock reservation
    return await withTransaction(async (session) => {
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        let prodQuery = Product.findById(item.productId);
        if (session) prodQuery = prodQuery.session(session);
        const product = await prodQuery;
        if (!product) {
          throw new NotFoundError(`Product ${item.productId}`);
        }

        let batchQuery = ProductBatch.findById(item.batchId);
        if (session) batchQuery = batchQuery.session(session);
        const batch = await batchQuery;
        if (!batch) {
          throw new NotFoundError(`ProductBatch ${item.batchId}`);
        }

        const unitPrice = item.unitPrice || product.price;
        const discount = item.discount || 0;
        const quantity = item.quantity;
        const itemTotal = (unitPrice - discount) * quantity;
        subtotal += itemTotal;

        // Atomically reserve stock in inventory inside transaction
        await InventoryService.reserveStock({
          productId: item.productId,
          batchId: item.batchId,
          branchId,
          quantity,
          orderId: orderNumber,
          user,
          req,
          session
        });

        orderItems.push({
          productId: product._id,
          batchId: batch._id,
          productName: product.name,
          sku: product.sku,
          quantity,
          unitPrice,
          discount,
          total: itemTotal
        });
      }

      const shippingCharge = Number(orderData.shippingCharge || 0);
      const discountTotal = Number(orderData.discountTotal || 0);
      const calculatedTotal = Math.max(0, subtotal + shippingCharge - discountTotal);
      const grandTotal = orderData.offerPrice ? Number(orderData.offerPrice) : calculatedTotal;

      const newOrder = new Order({
        orderNumber,
        customerId: customer._id,
        branchId,
        telecallerId: user.id || user._id,
        items: orderItems,
        subtotal,
        discountTotal,
        shippingCharge,
        offerPrice: orderData.offerPrice ? Number(orderData.offerPrice) : undefined,
        grandTotal,
        status: ORDER_STATUS.NEW,
        paymentMethod,
        paymentStatus: paymentMethod === 'COD' ? 'COD_PENDING' : 'PENDING',
        patientDetails: {
          patientName: orderData.patientName || customer.name,
          fatherName: orderData.fatherName || customer.fatherName,
          mobile: orderData.mobile || customer.mobile,
          alternateMobile: orderData.altMobile || orderData.alternateMobile || customer.altMobile
        },
        patientAppRegistered: Boolean(orderData.patientAppRegistered),
        deliveryAddress: {
          street: deliveryAddress?.street || 'Main Street',
          landmark: deliveryAddress?.landmark || '',
          village: deliveryAddress?.village || '',
          taluk: deliveryAddress?.taluk || '',
          district: deliveryAddress?.district || '',
          city: deliveryAddress?.city || 'Hosur',
          state: deliveryAddress?.state || 'Tamil Nadu',
          pincode: deliveryAddress?.pincode || '635109',
          phone: deliveryAddress?.phone || orderData.mobile || customer.mobile,
          alternatePhone: deliveryAddress?.alternatePhone || orderData.altMobile || customer.altMobile
        },
        notes,
        statusHistory: [
          {
            fromStatus: 'NONE',
            toStatus: ORDER_STATUS.NEW,
            changedBy: user.id || user._id,
            timestamp: new Date(),
            notes: 'Order Created & Stock Reserved'
          }
        ]
      });

      await newOrder.save({ session });

      // Record OrderStatusHistory
      await OrderStatusHistory.create(
        [
          {
            orderId: newOrder._id,
            fromStatus: 'NONE',
            toStatus: ORDER_STATUS.NEW,
            changedBy: user.id || user._id,
            notes: 'Order Created & Stock Reserved',
            timestamp: new Date()
          }
        ],
        session ? { session } : undefined
      );

      // Increment customer total orders & spent
      customer.totalOrders += 1;
      customer.totalSpent += grandTotal;
      await customer.save({ session });

      // Real-time notifications
      emitToBranch(branchId.toString(), 'order:new', {
        orderId: newOrder._id,
        orderNumber: newOrder.orderNumber,
        grandTotal
      });

      await AuditService.log({
        userId: user.id || user._id,
        branchId,
        action: 'ORDER_CREATED',
        module: 'orders',
        resourceType: 'Order',
        resourceId: newOrder._id,
        newValue: { orderNumber, grandTotal, itemsCount: items.length },
        req
      });

      return newOrder;
    });
  }

  /**
   * Strict Order State Transition Service
   */
  static async transitionStatus(orderId, targetStatus, { changedBy, notes, cancellationReason, req }) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order');
    }

    const previousStatus = order.status;

    // Validate state machine rule
    StateMachineService.validateOrderTransition(previousStatus, targetStatus);

    // If order is cancelled and was never dispatched, release reserved stock
    if (targetStatus === ORDER_STATUS.CANCELLED) {
      if (!StateMachineService.isDispatchedOrBeyond(previousStatus)) {
        for (const item of order.items) {
          await InventoryService.releaseReservedStock({
            productId: item.productId,
            batchId: item.batchId,
            branchId: order.branchId,
            quantity: item.quantity,
            orderId: order.orderNumber,
            user: changedBy,
            req
          });
        }
      }
      if (cancellationReason) {
        order.cancellationReason = cancellationReason;
      }
    }

    // Apply status update
    order.status = targetStatus;
    order.statusHistory.push({
      fromStatus: previousStatus,
      toStatus: targetStatus,
      changedBy: changedBy.id || changedBy._id,
      timestamp: new Date(),
      notes: notes || `Transitioned to ${targetStatus}`
    });

    await order.save();

    // Log standalone status history
    await OrderStatusHistory.create({
      orderId: order._id,
      fromStatus: previousStatus,
      toStatus: targetStatus,
      changedBy: changedBy.id || changedBy._id,
      notes: notes || `Transitioned from ${previousStatus} to ${targetStatus}`,
      timestamp: new Date()
    });

    // Notify listeners
    emitToBranch(order.branchId.toString(), 'order:status_changed', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      fromStatus: previousStatus,
      toStatus: targetStatus
    });

    await AuditService.log({
      userId: changedBy.id || changedBy._id,
      branchId: order.branchId,
      action: 'ORDER_STATUS_CHANGED',
      module: 'orders',
      resourceType: 'Order',
      resourceId: order._id,
      oldValue: { status: previousStatus },
      newValue: { status: targetStatus, notes },
      req
    });

    return order;
  }
}

export default OrderService;
