import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { ReorderService } from '../services/reorderService.js';
import { NotificationSchedulerService } from '../services/notificationSchedulerService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { saveSubscription, removeSubscription, sendPushToUser } from '../services/pushService.js';
import { emitToUser } from '../sockets/index.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;

  // Run 15-day reorder check non-blockingly in background
  ReorderService.checkAndCreateReorderNotifications().catch(() => {});

  const query = {
    $or: [{ userId: req.user.id }, { branchId: req.user.branchId }]
  };

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ ...query, isRead: false })
  ]);

  return ApiResponse.success(res, notifications, 'Notifications fetched', 200, { unreadCount });
});

export const markRead = asyncHandler(async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
  return ApiResponse.success(res, null, 'Notification marked as read');
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { $or: [{ userId: req.user.id }, { branchId: req.user.branchId }], isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return ApiResponse.success(res, null, 'All notifications marked as read');
});

/**
 * Get VAPID Public Key for client PushManager subscription
 */
export const getVapidPublicKey = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, {
    publicKey: env.VAPID_PUBLIC_KEY,
    domain: env.PUSH_NOTIFICATION_DOMAIN || 'shanthiayurvedas.com'
  }, 'VAPID public key retrieved');
});

/**
 * Subscribe device endpoint for Web Push notifications
 */
export const subscribePush = asyncHandler(async (req, res) => {
  const { subscription } = req.body;
  if (!subscription) {
    return ApiResponse.badRequest(res, 'Subscription data is required');
  }

  const userAgent = req.headers['user-agent'] || '';
  await saveSubscription(req.user.id, subscription, userAgent);

  return ApiResponse.success(res, null, 'Web Push subscription registered successfully');
});

/**
 * Unsubscribe device endpoint
 */
export const unsubscribePush = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return ApiResponse.badRequest(res, 'Subscription endpoint is required');
  }

  await removeSubscription(req.user.id, endpoint);
  return ApiResponse.success(res, null, 'Web Push subscription unsubscribed successfully');
});

/**
 * Send test push notification to the logged-in user
 */
export const testPush = asyncHandler(async (req, res) => {
  // If the client forwarded its current browser subscription, save it first to ensure instant sync
  if (req.body?.subscription) {
    const userAgent = req.headers['user-agent'] || '';
    try {
      await saveSubscription(req.user.id, req.body.subscription, userAgent);
    } catch (saveErr) {
      console.warn('Failed to save push subscription during test:', saveErr.message);
    }
  }

  const result = await sendPushToUser(req.user.id, {
    title: '🌿 Shanthi Ayurvedas Test Alert',
    body: 'Web Push notifications are working perfectly on this device!',
    link: '/dashboard',
    eventId: `test-push-${Date.now()}`
  });

  const message = result.success
    ? 'Test push notification dispatched successfully'
    : (result.reason || 'No active device registered for Web Push yet. Please enable push on this browser.');

  return ApiResponse.success(res, result, message);
});

/**
 * Get current user's registered push subscriptions / devices
 */
export const getPushSubscriptions = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('pushSubscriptions');
  return ApiResponse.success(res, user?.pushSubscriptions || [], 'Subscriptions retrieved');
});

/**
 * Simulate Trigger 1: Lead Assigned to Telecaller
 */
export const simulateLeadAssign = asyncHandler(async (req, res) => {
  const leadName = req.body.name || 'Ramesh Kumar';
  const mobile = req.body.mobile || '9840123456';
  const targetUserId = req.body.userId || req.user.id;

  const notif = await Notification.create({
    userId: targetUserId,
    branchId: req.user.branchId,
    title: '🎯 New Lead Assigned',
    message: `Lead ${leadName} (${mobile}) has been assigned to you.`,
    type: 'LEAD_ASSIGNED',
    data: {
      leadId: `sim-lead-${Date.now()}`,
      name: leadName,
      mobile
    }
  });

  emitToUser(targetUserId.toString(), 'lead:assigned', {
    leadId: notif.data.leadId,
    name: leadName,
    mobile
  });
  emitToUser(targetUserId.toString(), 'notification:new', notif);

  const pushRes = await sendPushToUser(targetUserId, {
    title: '🎯 New Lead Assigned',
    body: `Lead "${leadName}" (${mobile}) is assigned to you. Click to open and call now.`,
    link: `/leads?search=${encodeURIComponent(mobile)}`,
    eventId: `lead-sim-${Date.now()}`,
    tag: `lead-sim-${Date.now()}`
  });

  return ApiResponse.success(res, { notification: notif, pushResult: pushRes }, 'Lead assignment simulated');
});

/**
 * Simulate Trigger 2: Contact Leads & Refollow-Up Due Alert
 */
export const simulateFollowupDue = asyncHandler(async (req, res) => {
  const customerName = req.body.name || 'Suresh Sundaram';
  const mobile = req.body.mobile || '9876543210';
  const notes = req.body.notes || 'Call to discuss Ayurvedic pain relief oil course dosage';
  const targetUserId = req.body.userId || req.user.id;

  const notif = await Notification.create({
    userId: targetUserId,
    branchId: req.user.branchId,
    title: `⏰ Follow-up Due Now: ${customerName}`,
    message: `Scheduled follow-up with ${customerName} (${mobile}) is due now. Priority: HIGH. Notes: ${notes}`,
    type: 'FOLLOW_UP_DUE',
    data: {
      followupId: `sim-followup-${Date.now()}`,
      leadName: customerName,
      mobile,
      priority: 'HIGH'
    }
  });

  emitToUser(targetUserId.toString(), 'followup:due', {
    followupId: notif.data.followupId,
    customerName,
    mobile,
    scheduledAt: new Date()
  });
  emitToUser(targetUserId.toString(), 'notification:new', notif);

  const pushRes = await sendPushToUser(targetUserId, {
    title: `⏰ Follow-up Due: ${customerName}`,
    body: `Call ${customerName} (${mobile}) now. Note: ${notes}`,
    link: '/followups',
    eventId: `followup-sim-${Date.now()}`,
    tag: `followup-sim-${Date.now()}`
  });

  return ApiResponse.success(res, { notification: notif, pushResult: pushRes }, 'Follow-up due alert simulated');
});

/**
 * Simulate Trigger 3: 15-Day Reorder Reminder (Before 3 Days - 3x Daily)
 */
export const simulateReorderDue = asyncHandler(async (req, res) => {
  const patientName = req.body.name || 'Meenakshi Ammal';
  const mobile = req.body.mobile || '9840998877';
  const targetUserId = req.body.userId || req.user.id;

  const notif = await Notification.create({
    userId: targetUserId,
    branchId: req.user.branchId,
    title: `🔄 Reorder Due in 3 Days: ${patientName} (1/3 today)`,
    message: `Patient ${patientName} (ORD-20261023-A01) 15-day course will finish in 3 days. Call ${mobile} now to book repeat course.`,
    type: 'REORDER_DUE',
    data: {
      orderId: `sim-order-${Date.now()}`,
      orderNumber: 'ORD-SIM-001',
      patientName,
      mobile,
      daysUntilCourseEnd: 3,
      reminderNumber: 1
    }
  });

  emitToUser(targetUserId.toString(), 'reorder:due', {
    orderId: notif.data.orderId,
    orderNumber: notif.data.orderNumber,
    patientName,
    mobile,
    daysAgo: 12
  });
  emitToUser(targetUserId.toString(), 'notification:new', notif);

  const pushRes = await sendPushToUser(targetUserId, {
    title: `🔄 Reorder Due in 3 Days: ${patientName} (1/3 today)`,
    body: `Patient ${patientName} 15-day course will finish in 3 days. Call ${mobile} to book repeat course.`,
    link: `/orders?search=${encodeURIComponent(mobile)}`,
    eventId: `reorder-sim-${Date.now()}`,
    tag: `reorder-sim-${Date.now()}`,
    requireInteraction: true
  });

  return ApiResponse.success(res, { notification: notif, pushResult: pushRes }, 'Reorder reminder simulated');
});

/**
 * Trigger Trigger 4: Run Hourly Simultaneous Notification Cycle on demand
 */
export const triggerCycle = asyncHandler(async (req, res) => {
  const result = await NotificationSchedulerService.runHourlyNotificationCycle();
  return ApiResponse.success(res, result, 'Hourly notification cycle triggered successfully');
});


