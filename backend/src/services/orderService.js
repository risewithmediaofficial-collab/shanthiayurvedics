import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { assertRecordAccess, assertBranchAccess, recordScope, assertTelecallerBranch } from '../utils/recordScope.js';
import { User } from '../models/User.js';
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
    const resolvedBranchId = orderData.branchId || (!req?.branchScope?.isGlobal ? req?.branchScope?.branchId : null) || user?.branchId || (Array.isArray(user?.branches) && user.branches[0]);
    const {
      customerId,
      branchId = resolvedBranchId,
      items = [],
      paymentMethod = 'COD',
      deliveryAddress,
      notes
    } = orderData;

    assertBranchAccess(branchId, user, req);
    if (!branchId) throw new AppError('Select a branch before creating an order', 400);
    if (!Array.isArray(items)) throw new AppError('Order items must be an array', 400);
    for (const item of items) {
      if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0) throw new AppError('Item quantity must be a positive whole number', 400);
      for (const key of ['unitPrice', 'discount']) {
        if (item[key] !== undefined && (!Number.isFinite(Number(item[key])) || Number(item[key]) < 0)) throw new AppError('Item prices and discounts must be valid positive amounts', 400);
      }
    }
    for (const key of ['shippingCharge', 'discountTotal', 'offerPrice']) {
      if (orderData[key] !== undefined && (!Number.isFinite(Number(orderData[key])) || Number(orderData[key]) < 0)) throw new AppError('Order amounts must be valid positive amounts', 400);
    }

    const isOfficeSaleInit = Boolean(orderData.isOfficeSale || orderData.orderChannel === 'COUNTER_SALE');
    const courierName = isOfficeSaleInit ? 'Office Counter' : (orderData.courierName || 'India Post');
    const isProfessionalCourier = /professional/i.test(courierName);
    if (isProfessionalCourier && paymentMethod === 'COD') {
      throw new AppError('The Professional Courier does not support Cash on Delivery (COD). Pre-payment (UPI/Online) is required.', 400);
    }

    let targetCustomerId = customerId;
    let customer = null;

    if (targetCustomerId) {
      customer = await Customer.findById(targetCustomerId);
    } else if (orderData.patientName && orderData.mobile) {
      // Find existing customer by mobile or create new customer on the fly
      customer = await Customer.findOne({ mobile: orderData.mobile.trim(), branchId });
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

    assertRecordAccess(customer, user, req, 'assignedTelecallerId', 'Customer');

    // Generate unique order number (e.g. ORD-20260825-9831)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = randomUUID().slice(0, 8).toUpperCase();
    const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

    // Use withTransaction for atomic stock reservation
    return await withTransaction(async (session) => {
      let subtotal = 0;
      let totalItemDiscounts = 0;
      const orderItems = [];

      for (const item of items) {
        let prodQuery = Product.findById(item.productId);
        if (session) prodQuery = prodQuery.session(session);
        const product = await prodQuery;
        if (!product) {
          throw new NotFoundError(`Product ${item.productId}`);
        }

        let batch = null;
        if (item.batchId) {
          let batchQuery = ProductBatch.findById(item.batchId);
          if (session) batchQuery = batchQuery.session(session);
          batch = await batchQuery;
          if (batch && batch.productId.toString() !== product._id.toString()) {
            throw new AppError('The selected batch does not belong to this product', 400);
          }
        }

        const unitPrice = Number(item.unitPrice ?? product.price);
        let discount = Number(item.discount || 0);
        const discountPercent = Number(item.discountPercent || 0);
        if (discountPercent > 0 && !discount) {
          discount = Math.round((unitPrice * discountPercent) / 100);
        }
        if (discount > unitPrice) throw new AppError('Discount cannot exceed the item price', 400);
        const quantity = item.quantity;
        const itemGross = unitPrice * quantity;
        const itemDiscountTotal = discount * quantity;
        const itemTotal = (unitPrice - discount) * quantity;
        subtotal += itemGross;
        totalItemDiscounts += itemDiscountTotal;

        // Atomically reserve stock in inventory inside transaction
        await InventoryService.reserveStock({
          productId: item.productId,
          batchId: batch ? batch._id : (item.batchId || null),
          branchId,
          quantity,
          orderId: orderNumber,
          user,
          req,
          session
        });

        const itemWeight = Number(item.weight ?? product.weight ?? 0);
        orderItems.push({
          productId: product._id,
          batchId: batch ? batch._id : null,
          productName: product.name,
          sku: product.sku,
          quantity,
          unitPrice,
          discount,
          discountPercent,
          weight: itemWeight,
          total: itemTotal
        });
      }

      const totalWeight = orderItems.reduce((acc, it) => acc + (Number(it.weight || 0) * Number(it.quantity || 1)), 0);
      const orderWeight = orderData.weight !== undefined && orderData.weight !== null ? Number(orderData.weight) : totalWeight;
      const isOfficeSale = Boolean(orderData.isOfficeSale || orderData.orderChannel === 'COUNTER_SALE');
      const shippingCharge = isOfficeSale ? 0 : Number(orderData.shippingCharge || 0);
      const clientDiscountTotal = Number(orderData.discountTotal || 0);
      const discountTotal = clientDiscountTotal >= totalItemDiscounts
        ? clientDiscountTotal
        : (totalItemDiscounts + clientDiscountTotal);
      const calculatedTotal = Math.max(0, subtotal - discountTotal + shippingCharge);
      const grandTotal = orderData.offerPrice ? Number(orderData.offerPrice) : calculatedTotal;
      const codAmount = (isOfficeSale || isProfessionalCourier) ? 0 : (orderData.codAmount !== undefined && orderData.codAmount !== null && orderData.codAmount !== ''
        ? Number(orderData.codAmount)
        : (paymentMethod === 'COD' ? grandTotal : 0));

      const assignedTelecallerId = orderData.telecallerId || user.id || user._id;
      let telecallerName = orderData.telecallerName || '';
      let telecallerPhone = orderData.telecallerPhone || '';

      if (!telecallerPhone || !telecallerName) {
        if (assignedTelecallerId) {
          try {
            let tcQuery = User.findById(assignedTelecallerId).select('name phone');
            if (session) tcQuery = tcQuery.session(session);
            const tcUser = await tcQuery;
            if (tcUser) {
              telecallerName = telecallerName || tcUser.name;
              telecallerPhone = telecallerPhone || tcUser.phone || '';
            }
          } catch (e) {
            // fallback gracefully
          }
        }
        if (!telecallerPhone && user?.phone) {
          telecallerPhone = user.phone;
        }
        if (!telecallerName && user?.name) {
          telecallerName = user.name;
        }
      }

      const resolvedPaymentMethod = isOfficeSale ? (orderData.paymentMethod || 'CASH') : paymentMethod;
      const resolvedPaymentStatus = isOfficeSale ? 'PAID' : (paymentMethod === 'COD' ? 'COD_PENDING' : 'PENDING');
      const resolvedStatus = isOfficeSale ? (orderData.status || ORDER_STATUS.DELIVERED) : ORDER_STATUS.NEW;
      const resolvedChannel = isOfficeSale ? 'COUNTER_SALE' : (orderData.orderChannel || 'DIRECT');

      const newOrder = new Order({
        orderNumber,
        customerId: customer._id,
        branchId,
        telecallerId: assignedTelecallerId,
        telecallerName,
        telecallerPhone,
        items: orderItems,
        subtotal,
        discountTotal,
        shippingCharge,
        codAmount,
        courierName,
        weight: orderWeight,
        offerPrice: orderData.offerPrice ? Number(orderData.offerPrice) : undefined,
        grandTotal,
        orderChannel: resolvedChannel,
        status: resolvedStatus,
        paymentMethod: resolvedPaymentMethod,
        paymentStatus: resolvedPaymentStatus,
        patientDetails: {
          patientName: orderData.patientName || customer.name,
          fatherName: orderData.fatherName || customer.fatherName,
          mobile: orderData.mobile || customer.mobile,
          alternateMobile: orderData.altMobile || orderData.alternateMobile || customer.altMobile
        },
        patientAppRegistered: Boolean(orderData.patientAppRegistered),
        notes: orderData.notes || (isOfficeSale ? 'Direct Office Counter Sale' : undefined),
        deliveryAddress: {
          street: deliveryAddress?.street || (isOfficeSale ? 'Office Walk-In Counter' : 'Main Street'),
          landmark: deliveryAddress?.landmark || '',
          village: deliveryAddress?.village || '',
          taluk: deliveryAddress?.taluk || '',
          district: deliveryAddress?.district || (isOfficeSale ? 'Hosur' : ''),
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
   * Strict Order State Transition Service (with optional forceRevert manager override)
   */
  static async transitionStatus(orderId, targetStatus, { changedBy, notes, cancellationReason, forceRevert = false, req } = {}) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order');
    }

    assertRecordAccess(order, changedBy, req, 'telecallerId', 'Order');
    if (!Object.values(ORDER_STATUS).includes(targetStatus)) throw new AppError('Unknown order status', 400);
    const previousStatus = order.status;
    if (previousStatus === targetStatus) return order;

    // Validate state machine rule unless forceRevert is explicitly granted
    StateMachineService.validateOrderTransition(previousStatus, targetStatus);

    // Move reserved units out of the outstanding queue exactly once on dispatch.
    if (targetStatus === ORDER_STATUS.DISPATCHED) {
      for (const item of order.items) {
        await InventoryService.dispatchReservedStock({
          productId: item.productId,
          batchId: item.batchId,
          branchId: order.branchId,
          quantity: item.quantity,
          orderId: order.orderNumber,
          user: changedBy
        });
      }
    }

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
    const transitionNote = notes || (forceRevert ? `Force revert / Manager override to ${targetStatus}` : `Transitioned to ${targetStatus}`);
    order.statusHistory.push({
      fromStatus: previousStatus,
      toStatus: targetStatus,
      changedBy: changedBy.id || changedBy._id,
      timestamp: new Date(),
      notes: transitionNote
    });

    await order.save();

    // Log standalone status history
    await OrderStatusHistory.create({
      orderId: order._id,
      fromStatus: previousStatus,
      toStatus: targetStatus,
      changedBy: changedBy.id || changedBy._id,
      notes: transitionNote,
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

  /**
   * Update Order Details
   */
  static async updateOrder(orderId, updateData, user, req) {
    let order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order');
    }

    assertRecordAccess(order, user, req, 'telecallerId', 'Order');
    for (const key of ['grandTotal', 'offerPrice']) {
      if (updateData[key] !== undefined && (!Number.isFinite(Number(updateData[key])) || Number(updateData[key]) < 0)) throw new AppError('Order amounts must be non-negative numbers', 400);
    }
    const oldValue = order.toObject();
    if (updateData.status && updateData.status !== order.status) {
      order = await this.transitionStatus(orderId, updateData.status, { changedBy: user, notes: updateData.notes, req });
    }
    for (const key of ['courierName', 'shippingDate', 'boxDimensions', 'weightGrams']) {
      if (updateData[key] !== undefined) order[key] = updateData[key];
    }

    if (updateData.patientDetails) {
      order.patientDetails = {
        ...order.patientDetails,
        ...updateData.patientDetails
      };
    } else if (updateData.patientName || updateData.mobile || updateData.alternateMobile) {
      order.patientDetails = {
        ...order.patientDetails,
        ...(updateData.patientName ? { patientName: updateData.patientName } : {}),
        ...(updateData.mobile ? { mobile: updateData.mobile } : {}),
        ...(updateData.alternateMobile ? { alternateMobile: updateData.alternateMobile } : {})
      };
    }

    if (order.customerId && (updateData.patientName || updateData.mobile || updateData.patientDetails?.patientName || updateData.patientDetails?.mobile)) {
      const custUpdate = {};
      const newName = updateData.patientName || updateData.patientDetails?.patientName;
      const newMobile = updateData.mobile || updateData.patientDetails?.mobile;
      if (newName) custUpdate.name = newName.trim();
      if (newMobile) custUpdate.mobile = newMobile.trim();
      if (Object.keys(custUpdate).length > 0) {
        await Customer.findByIdAndUpdate(order.customerId, custUpdate);
      }
    }

    if (updateData.deliveryAddress) {
      order.deliveryAddress = {
        ...order.deliveryAddress,
        ...updateData.deliveryAddress
      };
    } else if (updateData.street || updateData.city || updateData.district || updateData.pincode) {
      order.deliveryAddress = {
        ...order.deliveryAddress,
        ...(updateData.street ? { street: updateData.street } : {}),
        ...(updateData.city ? { city: updateData.city } : {}),
        ...(updateData.district ? { district: updateData.district } : {}),
        ...(updateData.pincode ? { pincode: updateData.pincode } : {})
      };
    }

    if (updateData.trackingNumber !== undefined) {
      order.trackingNumber = updateData.trackingNumber;
    }

    if (updateData.grandTotal !== undefined && !isNaN(Number(updateData.grandTotal))) {
      order.grandTotal = Number(updateData.grandTotal);
    }



    if (updateData.paymentMethod) {
      order.paymentMethod = updateData.paymentMethod;
    }

    const effectiveCourier = order.courierName || 'India Post';
    const effectivePaymentMethod = order.paymentMethod;
    if (/professional/i.test(effectiveCourier) && effectivePaymentMethod === 'COD') {
      throw new AppError('The Professional Courier does not support Cash on Delivery (COD). Pre-payment (UPI/Online) is required.', 400);
    }
    if (/professional/i.test(effectiveCourier)) {
      order.codAmount = 0;
    }

    if (updateData.paymentStatus) {
      order.paymentStatus = updateData.paymentStatus;
    }

    if (updateData.notes !== undefined) {
      order.notes = updateData.notes;
    }

    if (updateData.offerPrice !== undefined) {
      order.offerPrice = updateData.offerPrice;
    }

    order.markModified('patientDetails');
    order.markModified('deliveryAddress');

    await order.save();

    await AuditService.log({
      userId: user.id || user._id,
      branchId: order.branchId,
      action: 'ORDER_UPDATED',
      module: 'orders',
      resourceType: 'Order',
      resourceId: order._id,
      oldValue,
      newValue: order.toObject(),
      req
    });

    return order;
  }

  /**
   * Delete Order and Cleanly Release Stock
   */
  static async deleteOrder(orderId, user, req) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order');
    }

    assertRecordAccess(order, user, req, 'telecallerId', 'Order');
    const isCounterSale = order.orderChannel === 'COUNTER_SALE' || order.notes?.includes('Office') || order.notes?.includes('Counter');
    if (StateMachineService.isDispatchedOrBeyond(order.status) && !isCounterSale) {
      throw new AppError('Dispatched orders must be retained. Use the returns workflow.', 409);
    }

    // If order was not yet dispatched/delivered (or is counter sale) and not cancelled, release reserved stock
    if ((!StateMachineService.isDispatchedOrBeyond(order.status) || isCounterSale) && order.status !== ORDER_STATUS.CANCELLED) {
      for (const item of order.items) {
        await InventoryService.releaseReservedStock({
          productId: item.productId,
          batchId: item.batchId,
          branchId: order.branchId,
          quantity: item.quantity,
          orderId: order.orderNumber,
          user,
          req
        });
      }
    }

    // Adjust customer totalOrders and totalSpent if customer exists
    if (order.customerId) {
      const customer = await Customer.findById(order.customerId);
      if (customer) {
        customer.totalOrders = Math.max(0, (customer.totalOrders || 1) - 1);
        customer.totalSpent = Math.max(0, (customer.totalSpent || order.grandTotal) - order.grandTotal);
        await customer.save();
      }
    }

    await Order.findByIdAndDelete(orderId);

    await AuditService.log({
      userId: user.id || user._id,
      branchId: order.branchId,
      action: 'ORDER_DELETED',
      module: 'orders',
      resourceType: 'Order',
      resourceId: orderId,
      oldValue: { orderNumber: order.orderNumber, grandTotal: order.grandTotal },
      req
    });

    emitToBranch(order.branchId.toString(), 'order:deleted', {
      orderId,
      orderNumber: order.orderNumber
    });

    return { message: 'Order deleted successfully' };
  }

  /**
   * Bulk transition multiple orders with optional forceRevert
   */
  static async bulkTransitionStatus(orderIds = [], targetStatus, { forceRevert = false, changedBy, notes, req } = {}) {
    const successful = [];
    const failed = [];

    for (const orderId of orderIds) {
      try {
        const updated = await this.transitionStatus(orderId, targetStatus, {
          changedBy,
          notes: notes || (forceRevert ? `Bulk force-reverted to ${targetStatus}` : `Bulk updated to ${targetStatus}`),
          forceRevert,
          req
        });
        successful.push({ orderId, orderNumber: updated.orderNumber, status: updated.status });
      } catch (err) {
        failed.push({ orderId, error: err.message });
      }
    }

    return {
      total: orderIds.length,
      successCount: successful.length,
      failedCount: failed.length,
      successful,
      failed
    };
  }

  /**
   * Bulk assign orders to a telecaller / verifier
   */
  static async bulkAssignVerification(orderIds = [], telecallerId, user, req) {
    const telecaller = await User.findById(telecallerId);
    const orders = await Order.find({ _id: { $in: orderIds }, ...recordScope(user, req, 'telecallerId') });
    for (const order of orders) assertTelecallerBranch(telecaller, order.branchId);
    const result = await Order.updateMany(
      { _id: { $in: orders.map((order) => order._id) } },
      { $set: { assignedVerifierId: telecallerId, telecallerId } }
    );

    await AuditService.log({
      userId: user.id || user._id,
      branchId: user.branchId,
      action: 'ORDERS_BULK_ASSIGNED',
      module: 'orders',
      resourceType: 'Order',
      newValue: { orderIds, telecallerId, modifiedCount: result.modifiedCount },
      req
    });

    return { updatedCount: result.modifiedCount };
  }

  /**
   * Bulk verify orders (marks verified and transitions NEW -> CONFIRMED)
   */
  static async bulkVerifyOrders(orderIds = [], user, req) {
    const now = new Date();
    const successful = [];

    for (const orderId of orderIds) {
      try {
        const order = await Order.findById(orderId);
        assertRecordAccess(order, user, req, 'telecallerId', 'Order');

        order.isVerified = true;
        order.verifiedBy = user.id || user._id;
        order.verifiedAt = now;

        if (order.status === ORDER_STATUS.NEW) {
          order.status = ORDER_STATUS.CONFIRMED;
          order.statusHistory.push({
            fromStatus: ORDER_STATUS.NEW,
            toStatus: ORDER_STATUS.CONFIRMED,
            changedBy: user.id || user._id,
            timestamp: now,
            notes: 'Bulk verified and confirmed'
          });
        }

        await order.save();
        successful.push(order._id);
      } catch (err) {
        // Skip failure
      }
    }

    await AuditService.log({
      userId: user.id || user._id,
      branchId: user.branchId,
      action: 'ORDERS_BULK_VERIFIED',
      module: 'orders',
      resourceType: 'Order',
      newValue: { orderIds: successful, verifiedCount: successful.length },
      req
    });

    return { verifiedCount: successful.length, orderIds: successful };
  }

  /**
   * Auto dispatch all packed and ready orders in branch
   */
  static async autoDispatchOrders(branchId, user, req) {
    const query = {
      ...recordScope(user, req, 'telecallerId'),
      status: { $in: [ORDER_STATUS.PACKED, ORDER_STATUS.READY_FOR_DISPATCH] }
    };
    if (branchId && branchId !== 'ALL') {
      query.branchId = branchId;
    }

    const ordersToDispatch = await Order.find(query);
    const dispatched = [];

    for (const order of ordersToDispatch) {
      try {
        if (order.status === ORDER_STATUS.PACKED) await this.transitionStatus(order._id, ORDER_STATUS.READY_FOR_DISPATCH, { changedBy: user, req });
        const updated = await this.transitionStatus(order._id, ORDER_STATUS.DISPATCHED, {
          changedBy: user,
          notes: 'Auto-dispatched from manager panel',
          req
        });
        dispatched.push(updated.orderNumber);
      } catch (e) {
        // Continue if single order transition fails
      }
    }

    return { count: dispatched.length, dispatchedOrders: dispatched };
  }

  /**
   * Batch import orders from Excel/CSV rows
   */
  static async importOrdersBatch(rows = [], branchId, user, req) {
    const results = { total: rows.length, imported: 0, failed: 0, errors: [] };

    // Get fallback active product & batch
    const defaultProduct = await Product.findOne({ isActive: { $ne: false } }).lean();
    let defaultBatch = null;
    if (defaultProduct) {
      defaultBatch = await ProductBatch.findOne({ productId: defaultProduct._id, isActive: true }).lean();
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const patientName = (row.patientName || row.name || row.customerName || 'Customer').trim();
        const mobile = (row.mobile || row.phone || '').toString().trim().replace(/[^0-9]/g, '');

        if (!mobile || mobile.length < 10) {
          throw new Error(`Row ${i + 1}: Valid 10-digit mobile number required`);
        }

        // Match product by name, SKU or disease
        let targetProduct = defaultProduct;
        let targetBatch = defaultBatch;

        if (row.productName || row.productSku || row.disease) {
          const searchStr = (row.productName || row.productSku || row.disease).trim();
          const matched = await Product.findOne({
            $or: [
              { name: { $regex: searchStr, $options: 'i' } },
              { sku: { $regex: searchStr, $options: 'i' } }
            ]
          }).lean();
          if (matched) {
            targetProduct = matched;
            const b = await ProductBatch.findOne({ productId: matched._id, isActive: true }).lean();
            if (b) targetBatch = b;
          }
        }

        if (!targetProduct) {
          throw new Error(`Row ${i + 1}: No active product found in catalog`);
        }

        const quantity = Math.max(1, parseInt(row.quantity || row.qty || 1, 10));
        const unitPrice = parseFloat(row.price || row.unitPrice || targetProduct.price || 500);
        const rawCourier = row.courierName || row.courier || row['Courier Partner'] || row['Courier'] || 'India Post';
        const courierName = String(rawCourier).trim();
        const isProfessional = /professional/i.test(courierName);
        let paymentMethod = ['COD', 'ONLINE', 'UPI', 'BANK_TRANSFER'].includes(row.paymentMethod?.toUpperCase())
          ? row.paymentMethod.toUpperCase()
          : (row.paymentMode?.toUpperCase() === 'PREPAID' ? 'ONLINE' : 'COD');
        if (isProfessional && paymentMethod === 'COD') {
          paymentMethod = 'ONLINE';
        }

        const orderData = {
          patientName,
          fatherName: (row.fatherName || '').trim(),
          mobile,
          altMobile: (row.altMobile || row.alternateMobile || '').toString().trim(),
          patientAppRegistered: Boolean(row.patientAppRegistered),
          branchId: branchId || user.branchId,
          courierName: isProfessional ? 'The Professional Courier' : courierName,
          paymentMethod,
          offerPrice,
          items: [
            {
              productId: targetProduct._id,
              batchId: targetBatch ? targetBatch._id : null,
              quantity,
              unitPrice
            }
          ],
          deliveryAddress: {
            street: row.street || row.address || 'Main Street',
            landmark: row.landmark || '',
            village: row.village || '',
            taluk: row.taluk || '',
            district: row.district || row.city || 'Krishnagiri',
            city: row.city || row.district || 'Hosur',
            state: row.state || 'Tamil Nadu',
            pincode: (row.pincode || '635109').toString().trim()
          },
          notes: row.notes || row.specialInstructions || `Imported via Excel (${new Date().toLocaleDateString()})`
        };

        const created = await this.createOrder(orderData, user, req);

        // If specific status requested and not NEW, transition it
        const targetStatus = row.status?.toUpperCase();
        if (targetStatus && targetStatus !== ORDER_STATUS.NEW && Object.values(ORDER_STATUS).includes(targetStatus)) {
          await this.transitionStatus(created._id, targetStatus, {
            changedBy: user,
            forceRevert: true,
            notes: 'Initial status from Excel import',
            req
          });
        }

        // If tracking number was provided, attach it
        if (row.trackingNumber || row.trackingId || row.articleNumber) {
          const trackingNo = (row.trackingNumber || row.trackingId || row.articleNumber).toString().trim();
          created.trackingNumber = trackingNo;
          await created.save();
        }

        results.imported++;
      } catch (err) {
        results.failed++;
        results.errors.push(err.message);
      }
    }

    return results;
  }

}

export default OrderService;
