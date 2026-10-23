import webpush from 'web-push';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let isInitialized = false;

/**
 * Initialize Web Push with VAPID details (RFC 8292)
 */
export const initWebPush = () => {
  if (isInitialized) return;
  try {
    if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        env.VAPID_EMAIL,
        env.VAPID_PUBLIC_KEY,
        env.VAPID_PRIVATE_KEY
      );
      isInitialized = true;
      logger.info({ email: env.VAPID_EMAIL }, '🔔 Web Push VAPID credentials successfully initialized');
    } else {
      logger.warn('Web Push VAPID keys not configured. Push notifications will be skipped.');
    }
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Web Push VAPID credentials');
  }
};

// Auto-initialize on module load
initWebPush();

/**
 * Save / register a push subscription for a user.
 * Prunes this endpoint from any other user first to protect shared devices.
 */
export const saveSubscription = async (userId, subscription, userAgent = '') => {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error('Invalid subscription object: missing endpoint or cryptographic keys.');
  }

  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys.p256dh;
  const auth = subscription.keys.auth;
  const expirationTime = subscription.expirationTime || null;

  // 1. Remove duplicate endpoint from any other user (prevents shared device leaks)
  await User.updateMany(
    { 'pushSubscriptions.endpoint': endpoint },
    { $pull: { pushSubscriptions: { endpoint } } }
  );

  // 2. Add or update on current user
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.pushSubscriptions) {
    user.pushSubscriptions = [];
  }

  const existingIndex = user.pushSubscriptions.findIndex((s) => s.endpoint === endpoint);
  if (existingIndex > -1) {
    user.pushSubscriptions[existingIndex].keys = { p256dh, auth };
    user.pushSubscriptions[existingIndex].expirationTime = expirationTime;
    user.pushSubscriptions[existingIndex].userAgent = userAgent;
    user.pushSubscriptions[existingIndex].lastStatus = 'active';
  } else {
    user.pushSubscriptions.push({
      endpoint,
      expirationTime,
      keys: { p256dh, auth },
      userAgent,
      createdAt: new Date(),
      lastStatus: 'active'
    });
  }

  await user.save({ validateBeforeSave: false });
  logger.info({ userId, endpoint: endpoint.slice(-20) }, 'Web Push subscription registered');
  return { success: true };
};

/**
 * Remove an existing subscription for a user
 */
export const removeSubscription = async (userId, endpoint) => {
  if (!endpoint) return { success: false, message: 'Endpoint is required' };

  await User.findByIdAndUpdate(userId, {
    $pull: { pushSubscriptions: { endpoint } }
  });

  logger.info({ userId, endpoint: endpoint.slice(-20) }, 'Web Push subscription unsubscribed');
  return { success: true };
};

/**
 * Send Web Push notification to a specific user across all their registered devices.
 * Automatically prunes 404/410 stale endpoints.
 */
export const sendPushToUser = async (userId, payload = {}) => {
  if (!isInitialized) initWebPush();
  if (!isInitialized) return { success: false, reason: 'VAPID not initialized' };

  try {
    const user = await User.findById(userId).select('pushSubscriptions');
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return { success: false, reason: 'No registered subscriptions for user' };
    }

    const title = payload.title || 'Shanthi Ayurvedas Alert';
    const destinationUrl = payload.link || payload.url || '/';
    const eventId = payload.eventId || `push-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const pushPayload = JSON.stringify({
      title,
      body: payload.body || payload.message || '',
      icon: payload.icon || '/shanthi_logo.png',
      badge: payload.badge || '/shanthi_logo.png',
      link: destinationUrl,
      url: destinationUrl,
      eventId,
      tag: payload.tag || eventId,
      vibrate: [250, 100, 250, 100, 250],
      requireInteraction: payload.requireInteraction !== false,
      data: {
        destinationUrl,
        ...payload.data
      }
    });

    const pushOptions = {
      TTL: 86400, // Keep in push gateway for 24 hours if device is offline
      urgency: payload.urgency || 'high'
    };

    const staleEndpoints = [];
    const successfulDeliveries = [];
    let lastDeliveryError = null;

    const deliveryPromises = user.pushSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys
          },
          pushPayload,
          pushOptions
        );
        successfulDeliveries.push(sub.endpoint);
      } catch (err) {
        lastDeliveryError = err.message || 'Push gateway delivery error';
        logger.warn(
          { statusCode: err.statusCode, endpoint: sub.endpoint.slice(-20), message: err.message, body: err.body },
          'Push delivery error'
        );
        // Prune stale or invalid subscriptions:
        // - 404 Not Found or 410 Gone (device unregistered or cleared)
        // - 403 / 401 with credentials mismatch (subscription created with different VAPID key)
        const isVapidMismatch =
          err.statusCode === 403 &&
          (typeof err.body === 'string' && (err.body.includes('VAPID credentials') || err.body.includes('authorization header')));
        if (err.statusCode === 404 || err.statusCode === 410 || isVapidMismatch) {
          staleEndpoints.push(sub.endpoint);
        }
      }
    });

    await Promise.all(deliveryPromises);

    // Prune dead subscriptions
    if (staleEndpoints.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: { pushSubscriptions: { endpoint: { $in: staleEndpoints } } }
      });
      logger.info({ userId, prunedCount: staleEndpoints.length }, 'Pruned stale push subscriptions');
    }

    // Update lastUsedAt timestamp on successful ones
    if (successfulDeliveries.length > 0) {
      await User.updateOne(
        { _id: userId, 'pushSubscriptions.endpoint': { $in: successfulDeliveries } },
        { $set: { 'pushSubscriptions.$.lastUsedAt': new Date(), 'pushSubscriptions.$.lastStatus': 'active' } }
      ).catch(() => {});
    }

    const isSuccess = successfulDeliveries.length > 0;
    return {
      success: isSuccess,
      sentCount: successfulDeliveries.length,
      stalePruned: staleEndpoints.length,
      reason: !isSuccess ? (staleEndpoints.length > 0 ? 'Device subscription was expired or had old VAPID credentials. Please click "Enable Web Push" to re-register.' : (lastDeliveryError || 'Push delivery failed')) : undefined
    };
  } catch (err) {
    logger.error({ err, userId }, 'Error in sendPushToUser');
    return { success: false, error: err.message };
  }
};

/**
 * Send Web Push to multiple users
 */
export const sendPushToUsers = async (userIds, payload = {}) => {
  if (!Array.isArray(userIds) || userIds.length === 0) return [];
  const results = await Promise.allSettled(
    userIds.map((uid) => sendPushToUser(uid, payload))
  );
  return results;
};

export default {
  initWebPush,
  saveSubscription,
  removeSubscription,
  sendPushToUser,
  sendPushToUsers
};
