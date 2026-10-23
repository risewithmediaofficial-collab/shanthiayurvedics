import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import webpush from 'web-push';
import '../src/models/index.js'; // Ensure all Mongoose models are registered
import { User } from '../src/models/User.js';
import { Branch } from '../src/models/Branch.js';
import { Lead } from '../src/models/Lead.js';
import { FollowUp } from '../src/models/FollowUp.js';
import { Order } from '../src/models/Order.js';
import { Notification } from '../src/models/Notification.js';
import { Customer } from '../src/models/Customer.js';
import { ROLES } from '../src/constants/roles.js';
import { FOLLOWUP_STATUS } from '../src/constants/leadStates.js';
import { saveSubscription, removeSubscription, sendPushToUser, initWebPush } from '../src/services/pushService.js';
import { LeadService } from '../src/services/leadService.js';
import { NotificationSchedulerService } from '../src/services/notificationSchedulerService.js';

describe('Web Push Notification System (RFC 8030 / RFC 8292)', () => {
  let mongoServer;
  let testBranch;
  let testTelecaller;
  let testManager;

  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    testBranch = await Branch.create({
      name: 'Hosur Main Hub',
      code: 'HSR',
      isActive: true,
      address: 'Main Road Hosur',
      phone: '9876543210'
    });

    testTelecaller = await User.create({
      name: 'Priya Telecaller',
      email: 'priya@shanthiayurvedas.com',
      username: 'priya_tc',
      passwordHash: 'dummy_hash',
      role: ROLES.TELECALLER,
      branchId: testBranch._id,
      isActive: true
    });

    testManager = await User.create({
      name: 'Rajesh Manager',
      email: 'rajesh@shanthiayurvedas.com',
      username: 'rajesh_mgr',
      passwordHash: 'dummy_hash',
      role: ROLES.MANAGER,
      branchId: testBranch._id,
      isActive: true
    });


    // Mock webpush.sendNotification
    vi.spyOn(webpush, 'sendNotification').mockImplementation(async () => ({
      statusCode: 201,
      headers: {},
      body: ''
    }));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Push Subscription Management', () => {
    it('should save a valid Web Push subscription for a user', async () => {
      const sub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/sample-token-123',
        expirationTime: null,
        keys: {
          p256dh: 'BNcRdreALRFXTkOOUHK18WK25ypqS9DaYtsqtxQV4w024p17y9K345A==',
          auth: 'tBH2CJh896bV4T6==='
        }
      };

      const result = await saveSubscription(testTelecaller._id, sub, 'Chrome/Windows');
      expect(result.success).toBe(true);

      const user = await User.findById(testTelecaller._id);
      expect(user.pushSubscriptions).toHaveLength(1);
      expect(user.pushSubscriptions[0].endpoint).toBe(sub.endpoint);
      expect(user.pushSubscriptions[0].keys.p256dh).toBe(sub.keys.p256dh);
      expect(user.pushSubscriptions[0].keys.auth).toBe(sub.keys.auth);
      expect(user.pushSubscriptions[0].userAgent).toBe('Chrome/Windows');
    });

    it('should deduplicate endpoint if another user subscribed from the same device', async () => {
      const sharedEndpoint = 'https://updates.push.services.mozilla.com/wpush/v2/shared-device-token';
      const sub = {
        endpoint: sharedEndpoint,
        keys: { p256dh: 'key1', auth: 'auth1' }
      };

      // User 1 subscribes
      await saveSubscription(testTelecaller._id, sub, 'Firefox/Windows');

      // User 2 logs in on same device & subscribes
      await saveSubscription(testManager._id, sub, 'Firefox/Windows');

      // User 1 should no longer have the shared endpoint
      const u1 = await User.findById(testTelecaller._id);
      expect(u1.pushSubscriptions.some((s) => s.endpoint === sharedEndpoint)).toBe(false);

      // User 2 should have it
      const u2 = await User.findById(testManager._id);
      expect(u2.pushSubscriptions.some((s) => s.endpoint === sharedEndpoint)).toBe(true);
    });

    it('should cleanly remove a subscription on unsubscribe', async () => {
      const sub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/to-be-removed',
        keys: { p256dh: 'key2', auth: 'auth2' }
      };
      await saveSubscription(testTelecaller._id, sub);

      const res = await removeSubscription(testTelecaller._id, sub.endpoint);
      expect(res.success).toBe(true);

      const user = await User.findById(testTelecaller._id);
      expect(user.pushSubscriptions.some((s) => s.endpoint === sub.endpoint)).toBe(false);
    });

    it('should automatically prune stale endpoints when push service returns 410 or 404', async () => {
      const deadEndpoint = 'https://fcm.googleapis.com/fcm/send/expired-token-410';
      await saveSubscription(testTelecaller._id, {
        endpoint: deadEndpoint,
        keys: { p256dh: 'key', auth: 'auth' }
      });

      // Simulate 410 Gone from Google FCM
      vi.spyOn(webpush, 'sendNotification').mockRejectedValueOnce({
        statusCode: 410,
        message: 'Endpoint expired or unregistered'
      });

      const pushRes = await sendPushToUser(testTelecaller._id, {
        title: 'Test Stale',
        body: 'Testing auto-prune'
      });

      expect(pushRes.stalePruned).toBe(1);

      // Verify pruned from DB
      const user = await User.findById(testTelecaller._id);
      expect(user.pushSubscriptions).toHaveLength(0);
    });
  });

  describe('Trigger 1: Lead Assigned to Telecaller', () => {
    it('should create in-app notification and dispatch Web Push when a lead is created and assigned', async () => {
      const sub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/lead-assigned-token',
        keys: { p256dh: 'p256', auth: 'auth' }
      };
      await saveSubscription(testTelecaller._id, sub);

      const leadData = {
        name: 'Arun Kumar',
        mobile: '9840123456',
        branchId: testBranch._id,
        assignedTo: testTelecaller._id,
        source: 'MANUAL'
      };

      const result = await LeadService.createLead(leadData, testManager, {
        branchScope: { isGlobal: false, branchId: testBranch._id }
      });

      expect(result.lead).toBeDefined();

      // Check DB notification was created
      const notifs = await Notification.find({ userId: testTelecaller._id, type: 'LEAD_ASSIGNED' });
      expect(notifs).toHaveLength(1);
      expect(notifs[0].title).toContain('New Lead Assigned');
      expect(notifs[0].message).toContain('Arun Kumar');

      // Check Web Push was dispatched
      expect(webpush.sendNotification).toHaveBeenCalled();
      const lastCall = vi.mocked(webpush.sendNotification).mock.calls.at(-1);
      expect(lastCall[0].endpoint).toBe(sub.endpoint);
      const payload = JSON.parse(lastCall[1]);
      expect(payload.title).toContain('New Lead Assigned');
      expect(payload.body).toContain('Arun Kumar');
    });

    it('should notify telecaller via Web Push and in-app alert when lead is reassigned by manager', async () => {
      const sub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/reassign-token',
        keys: { p256dh: 'p256', auth: 'auth' }
      };
      await saveSubscription(testTelecaller._id, sub);

      const lead = await Lead.create({
        name: 'Kavitha Devi',
        mobile: '9876543211',
        branchId: testBranch._id,
        status: 'NEW'
      });

      await LeadService.reassignLead(lead._id, testTelecaller._id, 'Territory reassignment', testManager, {
        branchScope: { isGlobal: false, branchId: testBranch._id }
      });

      const notifs = await Notification.find({ userId: testTelecaller._id, type: 'LEAD_ASSIGNED' });
      expect(notifs.length).toBeGreaterThanOrEqual(1);
      expect(notifs[0].message).toContain('Kavitha Devi');

      expect(webpush.sendNotification).toHaveBeenCalled();
    });
  });

  describe('Trigger 2: Contact Leads & Refollow-up Date Noted', () => {
    it('should create notification and Web Push when a refollow-up date is noted in call log', async () => {
      const sub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/followup-token',
        keys: { p256dh: 'p256', auth: 'auth' }
      };
      await saveSubscription(testTelecaller._id, sub);

      const lead = await Lead.create({
        name: 'Suresh Raina',
        mobile: '9988776655',
        branchId: testBranch._id,
        assignedTo: testTelecaller._id,
        status: 'NEW'
      });

      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await LeadService.logCall(
        lead._id,
        {
          callStatus: 'CALL_LATER',
          notes: 'Customer asked to call back next Monday 10am',
          nextFollowUpAt: nextWeek,
          callDurationSeconds: 45
        },
        testTelecaller,
        { branchScope: { isGlobal: false, branchId: testBranch._id } }
      );

      // Follow-up scheduled notification created
      const notifs = await Notification.find({ userId: testTelecaller._id, type: 'FOLLOW_UP_SCHEDULED' });
      expect(notifs).toHaveLength(1);
      expect(notifs[0].title).toContain('Refollow-up Scheduled');

      // Web Push sent
      expect(webpush.sendNotification).toHaveBeenCalled();
    });

    it('should dispatch due follow-up alert during hourly cycle when scheduled date arrives', async () => {
      const sub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/due-followup-token',
        keys: { p256dh: 'p256', auth: 'auth' }
      };
      await saveSubscription(testTelecaller._id, sub);

      const lead = await Lead.create({
        name: 'Vignesh Sundaram',
        mobile: '9123456789',
        branchId: testBranch._id,
        assignedTo: testTelecaller._id
      });

      // Scheduled 30 minutes in the past
      const pastTime = new Date(Date.now() - 30 * 60 * 1000);
      await FollowUp.create({
        leadId: lead._id,
        telecallerId: testTelecaller._id,
        branchId: testBranch._id,
        scheduledAt: pastTime,
        priority: 'HIGH',
        notes: 'Discuss oil dosage',
        status: FOLLOWUP_STATUS.PENDING,
        isNotificationSent: false
      });

      // Run hourly cycle
      const res = await NotificationSchedulerService.checkAndDispatchDueFollowups();
      expect(res.count).toBe(1);

      // Check DB notification created
      const dueNotifs = await Notification.find({ userId: testTelecaller._id, type: 'FOLLOW_UP_DUE' });
      expect(dueNotifs).toHaveLength(1);
      expect(dueNotifs[0].title).toContain('Follow-up Due Now: Vignesh Sundaram');

      // Verify follow-up marked as notified
      const updatedFollowup = await FollowUp.findOne({ leadId: lead._id });
      expect(updatedFollowup.isNotificationSent).toBe(true);

      // Running cycle again immediately shouldn't resend
      const res2 = await NotificationSchedulerService.checkAndDispatchDueFollowups();
      expect(res2.count).toBe(0);
    });
  });

  describe('Trigger 3 & 4: Reorder Notification Before 3 Days Daily 3 Times (Hourly Cycle)', () => {
    it('should dispatch reorder reminders starting 3 days before 15-day course completion up to 3 times daily', async () => {
      const sub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/reorder-token',
        keys: { p256dh: 'p256', auth: 'auth' }
      };
      await saveSubscription(testTelecaller._id, sub);

      const customer = await Customer.create({
        name: 'Meenakshi Ammal',
        mobile: '9840998877',
        branchId: testBranch._id,
        assignedTelecallerId: testTelecaller._id
      });

      // Placed 13 days ago (15-day course finishes in 2 days, i.e. within "before 3 days" window)
      const thirteenDaysAgo = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
      const testOrder = await Order.create({
        orderNumber: 'ORD-TEST-REORDER-001',
        customerId: customer._id,
        branchId: testBranch._id,
        telecallerId: testTelecaller._id,
        telecallerName: testTelecaller.name,
        patientDetails: {
          patientName: 'Meenakshi Ammal',
          mobile: '9840998877'
        },
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            productName: 'Ayur Joint Pain Oil 100ml',
            sku: 'OIL-100',
            quantity: 1,
            unitPrice: 500,
            total: 500
          }
        ],
        subtotal: 500,
        grandTotal: 500,
        status: 'DELIVERED',
        createdAt: thirteenDaysAgo
      });

      // First check (Reminder 1 of 3 for the day)
      const run1 = await NotificationSchedulerService.checkAndDispatchReorderReminders();
      expect(run1.count).toBe(1);

      const notifs1 = await Notification.find({
        userId: testTelecaller._id,
        type: 'REORDER_DUE',
        'data.orderId': testOrder._id
      });
      expect(notifs1).toHaveLength(1);
      expect(notifs1[0].title).toContain('1/3 today');
      expect(notifs1[0].message).toContain('Meenakshi Ammal');

      // Immediate check should respect the cooldown
      const runImmediate = await NotificationSchedulerService.checkAndDispatchReorderReminders();
      expect(runImmediate.count).toBe(0);

      // Simulate 4 hours later: Reminder 2 of 3 (shift first notification 4 hours back into today)
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      if (fourHoursAgo < new Date(new Date().setHours(0, 0, 0, 0))) {
        fourHoursAgo.setHours(1, 0, 0, 0);
      }
      await Notification.collection.updateOne({ _id: notifs1[0]._id }, { $set: { createdAt: fourHoursAgo } });
      const run2 = await NotificationSchedulerService.checkAndDispatchReorderReminders();
      expect(run2.count).toBe(1);

      // Simulate another 4 hours later: Reminder 3 of 3
      const notifs2 = await Notification.find({
        userId: testTelecaller._id,
        type: 'REORDER_DUE',
        'data.orderId': testOrder._id
      }).sort({ createdAt: -1 });
      const eightHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      await Notification.collection.updateOne({ _id: notifs2[0]._id }, { $set: { createdAt: eightHoursAgo } });
      const run3 = await NotificationSchedulerService.checkAndDispatchReorderReminders();
      expect(run3.count).toBe(1);

      // 4th run today should be blocked by the daily 3x maximum
      const notifs3 = await Notification.find({
        userId: testTelecaller._id,
        type: 'REORDER_DUE',
        'data.orderId': testOrder._id
      }).sort({ createdAt: -1 });
      await Notification.collection.updateOne({ _id: notifs3[0]._id }, { $set: { createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) } });
      const run4 = await NotificationSchedulerService.checkAndDispatchReorderReminders();
      expect(run4.count).toBe(0); // Capped at 3 daily!
    });


    it('should run both follow-up and reorder checks simultaneously in runHourlyNotificationCycle', async () => {
      const cycleResult = await NotificationSchedulerService.runHourlyNotificationCycle();
      expect(cycleResult).toHaveProperty('followupsCount');
      expect(cycleResult).toHaveProperty('reordersCount');
      expect(cycleResult).toHaveProperty('total');
    });
  });
});
