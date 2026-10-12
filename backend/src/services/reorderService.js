import { Order } from '../models/Order.js';
import { Customer } from '../models/Customer.js';
import { Notification } from '../models/Notification.js';
import { emitToUser, emitToBranch } from '../sockets/index.js';
import { logger } from '../config/logger.js';
import { ROLES } from '../constants/roles.js';

export class ReorderService {
  /**
   * Get all orders/customers that are due for a 15-day treatment reorder.
   */
  static async getReordersDue({ page = 1, limit = 50, search = '', minDays = 15, maxDays = 90 }, user, branchScope) {
    const now = new Date();
    const minDaysAgo = new Date(now.getTime() - minDays * 24 * 60 * 60 * 1000);
    const maxDaysAgo = new Date(now.getTime() - maxDays * 24 * 60 * 60 * 1000);

    const orderQuery = {
      createdAt: { $lte: minDaysAgo, $gte: maxDaysAgo },
      status: { $nin: ['CANCELLED', 'RTO'] }
    };

    if (!branchScope?.isGlobal && branchScope?.branchId) {
      orderQuery.branchId = branchScope.branchId;
    }

    if (user?.role === ROLES.TELECALLER) {
      const tcId = user.id || user._id;
      orderQuery.$and = [
        {
          $or: [
            { telecallerId: tcId },
            { 'statusHistory.0.changedBy': tcId }
          ]
        }
      ];
    }

    if (search) {
      const searchOr = {
        $or: [
          { 'patientDetails.patientName': { $regex: search, $options: 'i' } },
          { 'patientDetails.mobile': { $regex: search, $options: 'i' } },
          { orderNumber: { $regex: search, $options: 'i' } }
        ]
      };
      if (orderQuery.$and) {
        orderQuery.$and.push(searchOr);
      } else {
        orderQuery.$or = searchOr.$or;
      }
    }

    const orders = await Order.find(orderQuery)
      .populate('customerId', 'name mobile altMobile addresses totalOrders totalSpent')
      .populate('branchId', 'name code')
      .populate('telecallerId', 'name email mobile phone')
      .sort({ createdAt: -1 })
      .lean();

    // Check which customers have already reordered within the last 14 days
    const reordersDue = [];
    const customerIdsProcessed = new Set();

    for (const ord of orders) {
      const custId = ord.customerId?._id?.toString() || ord.customerId?.toString();
      const mobile = ord.patientDetails?.mobile || ord.customerId?.mobile;

      // Group by customer so we only recommend reorder for the latest completed course
      const dedupeKey = custId || mobile;
      if (!dedupeKey || customerIdsProcessed.has(dedupeKey)) continue;

      // Check if there is an order placed within the last 14 days
      const recentOrderExists = await Order.exists({
        $or: [
          custId ? { customerId: custId } : null,
          mobile ? { 'patientDetails.mobile': mobile } : null
        ].filter(Boolean),
        createdAt: { $gt: minDaysAgo },
        status: { $nin: ['CANCELLED', 'RTO'] }
      });

      if (!recentOrderExists) {
        customerIdsProcessed.add(dedupeKey);
        const orderDate = new Date(ord.createdAt);
        const daysSinceOrder = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

        reordersDue.push({
          orderId: ord._id,
          orderNumber: ord.orderNumber,
          customerId: custId,
          customerName: ord.patientDetails?.patientName || ord.customerId?.name || 'Customer',
          mobile: ord.patientDetails?.mobile || ord.customerId?.mobile || '',
          daysSinceOrder,
          orderDate: ord.createdAt,
          grandTotal: ord.grandTotal,
          items: ord.items?.map((i) => ({
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice
          })) || [],
          telecallerName: ord.telecallerName || ord.telecallerId?.name || 'Unassigned',
          telecallerId: ord.telecallerId?._id || ord.telecallerId,
          telecallerPhone: ord.telecallerPhone || ord.telecallerId?.mobile || '',
          branchName: ord.branchId?.name || 'Hosur Main Hub'
        });
      }
    }

    // Pagination in-memory
    const skip = (page - 1) * limit;
    const paginated = reordersDue.slice(skip, skip + limit);

    return {
      data: paginated,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: reordersDue.length,
        totalPages: Math.ceil(reordersDue.length / limit) || 1
      }
    };
  }

  /**
   * Automatically check orders and generate 15-day reorder notifications
   * to telecallers and order creators.
   */
  static async checkAndCreateReorderNotifications() {
    try {
      const now = new Date();
      // Orders placed between 15 and 45 days ago
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

      const candidateOrders = await Order.find({
        createdAt: { $lte: fifteenDaysAgo, $gte: fortyFiveDaysAgo },
        status: { $nin: ['CANCELLED', 'RTO'] }
      })
        .select('_id orderNumber customerId branchId telecallerId telecallerName telecallerPhone patientDetails createdAt items grandTotal statusHistory')
        .lean();

      let createdCount = 0;

      for (const ord of candidateOrders) {
        // Collect recipients: assigned telecaller + creator who placed the order
        const recipientUserIds = new Set();
        if (ord.telecallerId) {
          recipientUserIds.add(ord.telecallerId.toString());
        }
        const createdById = ord.statusHistory?.[0]?.changedBy;
        if (createdById) {
          recipientUserIds.add(createdById.toString());
        }

        if (recipientUserIds.size === 0) continue;

        // Verify patient hasn't placed a new order in the last 14 days
        const hasReordered = await Order.exists({
          $or: [
            ord.customerId ? { customerId: ord.customerId } : null,
            ord.patientDetails?.mobile ? { 'patientDetails.mobile': ord.patientDetails.mobile } : null
          ].filter(Boolean),
          createdAt: { $gt: fifteenDaysAgo },
          status: { $nin: ['CANCELLED', 'RTO'] }
        });

        if (hasReordered) continue;

        const orderDate = new Date(ord.createdAt);
        const daysAgo = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
        const patientName = ord.patientDetails?.patientName || 'Patient';
        const mobile = ord.patientDetails?.mobile || '';

        for (const recipientId of recipientUserIds) {
          // Check if a REORDER_DUE notification already exists for this order & user
          const alreadyNotified = await Notification.exists({
            userId: recipientId,
            type: 'REORDER_DUE',
            'data.orderId': ord._id
          });

          if (alreadyNotified) continue;

          const notificationPayload = {
            userId: recipientId,
            branchId: ord.branchId,
            title: `🔄 15-Day Reorder Due: ${patientName}`,
            message: `Patient ${patientName} (${ord.orderNumber}) completed 15 days of treatment (${daysAgo} days ago). Call ${mobile} to book repeat course.`,
            type: 'REORDER_DUE',
            data: {
              orderId: ord._id,
              orderNumber: ord.orderNumber,
              customerId: ord.customerId,
              patientName,
              mobile,
              daysAgo
            }
          };

          const newNotification = await Notification.create(notificationPayload);
          createdCount++;

          // Real-time socket delivery
          emitToUser(recipientId, 'notification:new', newNotification);
        }

        if (ord.branchId) {
          emitToBranch(ord.branchId.toString(), 'reorder:due', {
            orderId: ord._id,
            orderNumber: ord.orderNumber,
            patientName,
            mobile,
            daysAgo: Math.floor((now.getTime() - new Date(ord.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          });
        }
      }

      if (createdCount > 0) {
        logger.info(`🔔 Generated ${createdCount} 15-day reorder notifications.`);
      }
      }

      return createdCount;
    } catch (err) {
      logger.error({ err }, 'Error in checkAndCreateReorderNotifications');
      return 0;
    }
  }
}

export default ReorderService;
