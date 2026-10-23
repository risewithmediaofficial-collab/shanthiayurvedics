import cron from 'node-cron';
import { FollowUp } from '../models/FollowUp.js';
import { Order } from '../models/Order.js';
import { Notification } from '../models/Notification.js';
import { sendPushToUser } from './pushService.js';
import { emitToUser, emitToBranch } from '../sockets/index.js';
import { logger } from '../config/logger.js';
import { FOLLOWUP_STATUS } from '../constants/leadStates.js';

export class NotificationSchedulerService {
  /**
   * Check for scheduled follow-ups and refollow-ups that are due,
   * sending DB notifications, Socket events, and Web Push notifications.
   */
  static async checkAndDispatchDueFollowups() {
    try {
      const now = new Date();

      // Find all pending follow-ups where scheduled date/time is due and not yet notified
      const dueFollowups = await FollowUp.find({
        status: FOLLOWUP_STATUS.PENDING,
        scheduledAt: { $lte: now },
        isNotificationSent: { $ne: true }
      })
        .populate('leadId', 'name mobile altMobile city status')
        .populate('customerId', 'name mobile')
        .populate('telecallerId', 'name email role')
        .lean();

      if (!dueFollowups || dueFollowups.length === 0) {
        return { count: 0 };
      }

      logger.info({ count: dueFollowups.length }, '⏰ Processing due follow-ups for notification dispatch');
      let dispatchedCount = 0;

      for (const item of dueFollowups) {
        const telecallerId = item.telecallerId?._id?.toString() || item.telecallerId?.toString();
        if (!telecallerId) continue;

        const leadName = item.leadId?.name || item.customerId?.name || 'Customer';
        const mobile = item.leadId?.mobile || item.customerId?.mobile || '';
        const notes = item.notes || 'Scheduled refollow-up';
        const priority = item.priority || 'MEDIUM';

        // 1. Create In-App Notification in MongoDB
        const notif = await Notification.create({
          userId: telecallerId,
          branchId: item.branchId,
          title: `⏰ Follow-up Due Now: ${leadName}`,
          message: `Scheduled follow-up with ${leadName} (${mobile}) is due now. Priority: ${priority}. Notes: ${notes}`,
          type: 'FOLLOW_UP_DUE',
          data: {
            followupId: item._id,
            leadId: item.leadId?._id,
            customerId: item.customerId?._id,
            leadName,
            mobile,
            priority,
            scheduledAt: item.scheduledAt
          }
        });

        // 2. Real-time Socket Event
        emitToUser(telecallerId, 'notification:new', notif);
        emitToUser(telecallerId, 'followup:due', {
          followupId: item._id,
          customerName: leadName,
          mobile,
          scheduledAt: item.scheduledAt
        });

        // 3. Web Push Notification to Device / Browser
        await sendPushToUser(telecallerId, {
          title: `⏰ Follow-up Due: ${leadName}`,
          body: `Call ${leadName} (${mobile}) now. ${notes}`,
          link: '/followups',
          eventId: `followup-due-${item._id}`,
          tag: `followup-${item._id}`,
          urgency: priority === 'URGENT' || priority === 'HIGH' ? 'high' : 'normal'
        }).catch((err) => {
          logger.warn({ err, telecallerId }, 'Web Push delivery error on due followup');
        });

        // 4. Mark follow-up as notified
        await FollowUp.findByIdAndUpdate(item._id, { isNotificationSent: true });
        dispatchedCount++;
      }

      logger.info({ dispatchedCount }, '⏰ Finished dispatching due follow-up notifications');
      return { count: dispatchedCount };
    } catch (err) {
      logger.error({ err }, 'Error in checkAndDispatchDueFollowups');
      return { count: 0, error: err.message };
    }
  }

  /**
   * Check for orders nearing treatment completion (before 3 days)
   * and overdue reorders, dispatching up to 3 times daily per order to the assigned telecaller.
   */
  static async checkAndDispatchReorderReminders() {
    try {
      const now = new Date();
      // Treatment duration is 15 days. Reminders start 3 days before (Day 12) up to 60 days
      const twelveDaysAgo = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Start of current calendar day for daily count tracking
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const candidateOrders = await Order.find({
        createdAt: { $lte: twelveDaysAgo, $gte: sixtyDaysAgo },
        status: { $nin: ['CANCELLED', 'RTO'] }
      })
        .select('_id orderNumber customerId branchId telecallerId telecallerName telecallerPhone patientDetails createdAt items grandTotal statusHistory')
        .lean();

      if (!candidateOrders || candidateOrders.length === 0) {
        return { count: 0 };
      }

      let reorderNotifCount = 0;

      for (const ord of candidateOrders) {
        // Collect recipient user IDs: assigned telecaller + order creator
        const recipientUserIds = new Set();
        if (ord.telecallerId) {
          recipientUserIds.add(ord.telecallerId.toString());
        }
        const createdById = ord.statusHistory?.[0]?.changedBy;
        if (createdById) {
          recipientUserIds.add(createdById.toString());
        }

        if (recipientUserIds.size === 0) continue;

        // Verify patient hasn't placed a new order in the last 12 days
        const hasReordered = await Order.exists({
          $or: [
            ord.customerId ? { customerId: ord.customerId } : null,
            ord.patientDetails?.mobile ? { 'patientDetails.mobile': ord.patientDetails.mobile } : null
          ].filter(Boolean),
          createdAt: { $gt: twelveDaysAgo },
          status: { $nin: ['CANCELLED', 'RTO'] }
        });

        if (hasReordered) continue;

        const orderDate = new Date(ord.createdAt);
        const daysAgo = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysUntilCourseEnd = 15 - daysAgo;
        const patientName = ord.patientDetails?.patientName || 'Patient';
        const mobile = ord.patientDetails?.mobile || '';

        for (const recipientId of recipientUserIds) {
          // Check how many REORDER_DUE notifications have already been sent to this recipient for this order TODAY
          const notificationsSentToday = await Notification.countDocuments({
            userId: recipientId,
            type: 'REORDER_DUE',
            'data.orderId': ord._id,
            createdAt: { $gte: todayStart }
          });

          // Limit to 3 times daily
          if (notificationsSentToday >= 3) {
            continue;
          }

          // Enforce minimum 3 hours between reminders on the same day to distribute evenly
          const latestNotificationToday = await Notification.findOne({
            userId: recipientId,
            type: 'REORDER_DUE',
            'data.orderId': ord._id,
            createdAt: { $gte: todayStart }
          }).sort({ createdAt: -1 });

          if (latestNotificationToday) {
            const hoursSinceLast = (now.getTime() - new Date(latestNotificationToday.createdAt).getTime()) / (1000 * 60 * 60);
            if (hoursSinceLast < 3) {
              continue;
            }
          }

          const reminderNumber = notificationsSentToday + 1;
          const isBeforeDue = daysUntilCourseEnd > 0;
          const title = isBeforeDue
            ? `🔄 Reorder Due in ${daysUntilCourseEnd} Days: ${patientName} (${reminderNumber}/3 today)`
            : `🔄 15-Day Reorder Overdue: ${patientName} (${reminderNumber}/3 today)`;

          const message = isBeforeDue
            ? `Patient ${patientName} (${ord.orderNumber}) 15-day course will finish in ${daysUntilCourseEnd} days. Call ${mobile} now to book repeat course.`
            : `Patient ${patientName} (${ord.orderNumber}) completed 15-day course (${daysAgo} days ago). Call ${mobile} to book repeat course.`;

          // 1. In-App Notification
          const newNotification = await Notification.create({
            userId: recipientId,
            branchId: ord.branchId,
            title,
            message,
            type: 'REORDER_DUE',
            data: {
              orderId: ord._id,
              orderNumber: ord.orderNumber,
              customerId: ord.customerId,
              patientName,
              mobile,
              daysAgo,
              daysUntilCourseEnd,
              reminderNumber,
              maxDaily: 3
            }
          });

          // 2. Real-time Socket Event
          emitToUser(recipientId, 'notification:new', newNotification);

          // 3. Web Push Notification
          await sendPushToUser(recipientId, {
            title,
            body: message,
            link: `/orders?search=${encodeURIComponent(mobile || patientName)}`,
            eventId: `reorder-${ord._id}-${todayStart.toISOString().slice(0, 10)}-${reminderNumber}`,
            tag: `reorder-${ord._id}`,
            requireInteraction: true
          }).catch((err) => {
            logger.warn({ err, recipientId }, 'Web Push delivery error on reorder reminder');
          });

          reorderNotifCount++;
        }

        if (ord.branchId) {
          emitToBranch(ord.branchId.toString(), 'reorder:due', {
            orderId: ord._id,
            orderNumber: ord.orderNumber,
            patientName,
            mobile,
            daysAgo
          });
        }
      }

      if (reorderNotifCount > 0) {
        logger.info(`🔔 Dispatched ${reorderNotifCount} reorder reminder notifications (before 3 days, daily 3x check).`);
      }

      return { count: reorderNotifCount };
    } catch (err) {
      logger.error({ err }, 'Error in checkAndDispatchReorderReminders');
      return { count: 0, error: err.message };
    }
  }

  /**
   * Run all notification checks simultaneously (hourly batch)
   */
  static async runHourlyNotificationCycle() {
    logger.info('🚀 Starting hourly unified notification dispatch cycle...');
    const [followupsResult, reordersResult] = await Promise.allSettled([
      this.checkAndDispatchDueFollowups(),
      this.checkAndDispatchReorderReminders()
    ]);

    const followupsCount = followupsResult.status === 'fulfilled' ? followupsResult.value.count : 0;
    const reordersCount = reordersResult.status === 'fulfilled' ? reordersResult.value.count : 0;

    logger.info(
      { followupsCount, reordersCount, total: followupsCount + reordersCount },
      '✅ Hourly unified notification dispatch cycle completed'
    );

    return {
      followupsCount,
      reordersCount,
      total: followupsCount + reordersCount
    };
  }

  /**
   * Initialize the 1-hour recurring cron schedule and run an initial check
   */
  static initScheduler() {
    // Run an initial check after a short 10-second delay on boot to allow full DB sync
    setTimeout(() => {
      this.runHourlyNotificationCycle().catch((err) => {
        logger.warn({ err }, 'Initial boot notification cycle error');
      });
    }, 10000);

    // Schedule hourly: at minute 0 of every hour ('0 * * * *')
    const hourlyTask = cron.schedule('0 * * * *', () => {
      this.runHourlyNotificationCycle().catch((err) => {
        logger.warn({ err }, 'Hourly cron notification cycle error');
      });
    });

    logger.info('⏰ Hourly Notification Scheduler initialized (runs every 1 hour on the hour)');
    return hourlyTask;
  }
}

export default NotificationSchedulerService;
