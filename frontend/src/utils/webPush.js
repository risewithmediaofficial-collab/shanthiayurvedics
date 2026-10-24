import apiClient from '../api/apiClient.js';

/**
 * Convert VAPID Public Key base64 string to Uint8Array required by PushManager
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if Web Push & Service Workers are supported in current browser
 */
export function isWebPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Fetch VAPID public key from backend or fall back to environment variable
 */
export async function getVapidPublicKey() {
  try {
    const res = await apiClient.get('/notifications/vapid-public-key');
    if (res.data?.data?.publicKey) {
      return res.data.data.publicKey;
    }
  } catch (err) {
    console.warn('Could not fetch VAPID key from API, using environment fallback:', err.message);
  }

  return (
    import.meta.env.VITE_VAPID_PUBLIC_KEY ||
    'BLKpMYozLXrlu9rzCmhQPzK35uE7iw6TyhFmwMDDHYgT2GItwbAHUa78YpstoL-gomz8-9KvDHsIEHWFdNiIdis'
  );
}

/**
 * Check current push subscription status
 */
export async function getPushSubscriptionStatus() {
  if (!isWebPushSupported()) {
    return {
      isSupported: false,
      permission: 'unsupported',
      isSubscribed: false,
      subscription: null
    };
  }

  const permission = Notification.permission;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    return {
      isSupported: true,
      permission,
      isSubscribed: Boolean(subscription),
      subscription
    };
  } catch (_e) {
    return {
      isSupported: true,
      permission,
      isSubscribed: false,
      subscription: null
    };
  }
}

/**
 * Subscribe device to Web Push notifications
 */
/**
 * Subscribe device to Web Push notifications
 */
export async function subscribeToWebPush(options = {}) {
  if (!isWebPushSupported()) {
    return { success: false, reason: 'Web Push notifications are not supported by this browser.' };
  }

  // 1. Check or request Notification Permission
  let permission = Notification.permission;
  if (permission === 'default' && options.prompt) {
    try {
      permission = await Notification.requestPermission();
    } catch (_e) {
      permission = Notification.permission;
    }
  }

  if (permission !== 'granted') {
    return {
      success: false,
      reason: permission === 'denied'
        ? 'Notification permission is blocked in browser settings. Please allow notifications for this site.'
        : 'Permission prompt was dismissed.'
    };
  }

  // 2. Ensure Service Worker is registered
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }
  await navigator.serviceWorker.ready;

  // 3. Fetch current VAPID key
  const vapidKey = await getVapidPublicKey();
  const applicationServerKey = urlBase64ToUint8Array(vapidKey);
  let subscription = await reg.pushManager.getSubscription();

  // If there's an existing subscription, verify if it was created with this exact applicationServerKey
  if (subscription) {
    let keyMatches = false;
    if (subscription.options?.applicationServerKey) {
      const currentKey = new Uint8Array(subscription.options.applicationServerKey);
      keyMatches =
        currentKey.length === applicationServerKey.length &&
        currentKey.every((byte, i) => byte === applicationServerKey[i]);
    }
    if (!keyMatches || options.force) {
      console.log('🔄 Existing push subscription had different VAPID key. Re-subscribing with active key...');
      try {
        await subscription.unsubscribe();
      } catch (_e) {}
      subscription = null;
    }
  }

  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });
  }

  // 4. Send subscription JSON to backend
  if (subscription) {
    await apiClient.post('/notifications/subscribe', {
      subscription: subscription.toJSON(),
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform
      }
    });
  }

  return {
    success: true,
    subscription
  };
}

/**
 * Unsubscribe device from Web Push notifications
 */
export async function unsubscribeFromWebPush() {
  if (!isWebPushSupported()) return { success: true };

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await apiClient.post('/notifications/unsubscribe', { endpoint });
    }
    return { success: true };
  } catch (err) {
    console.error('Error during push unsubscribe:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Silently reconcile push subscription on app startup / login if permission is granted
 */
export async function reconcilePushSubscription() {
  if (!isWebPushSupported()) return;
  if (Notification.permission !== 'granted') return;

  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    await navigator.serviceWorker.ready;

    const vapidKey = await getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(vapidKey);
    let subscription = await reg.pushManager.getSubscription();

    // Verify key match
    if (subscription && subscription.options?.applicationServerKey) {
      const currentKey = new Uint8Array(subscription.options.applicationServerKey);
      const keyMatches =
        currentKey.length === applicationServerKey.length &&
        currentKey.every((byte, i) => byte === applicationServerKey[i]);
      if (!keyMatches) {
        await subscription.unsubscribe();
        subscription = null;
      }
    }

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    if (subscription) {
      await apiClient.post('/notifications/subscribe', {
        subscription: subscription.toJSON()
      });
    }
  } catch (err) {
    console.warn('Background push reconciliation note:', err.message);
  }
}

/**
 * Trigger a test Web Push notification to current user with instant feedback
 */
export async function triggerTestPush() {
  if (!isWebPushSupported()) {
    throw new Error('Web Push notifications are not supported in this browser.');
  }

  // Ensure active subscription with current VAPID key
  const subResult = await subscribeToWebPush();
  if (!subResult.success) {
    throw new Error(subResult.reason || 'Please allow notifications to receive alerts.');
  }

  const subscription = subResult.subscription;
  const payload = subscription ? { subscription: subscription.toJSON() } : {};

  // Request backend to dispatch Web Push via VAPID
  const res = await apiClient.post('/notifications/test-push', payload);

  // Deliver instant visible confirmation banner on user's device
  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    await navigator.serviceWorker.ready;

    if (Notification.permission === 'granted' && reg) {
      await reg.showNotification('🌿 Shanthi Ayurvedas Test Alert', {
        body: 'Web Push notifications are working perfectly on this device!',
        icon: '/shanthi_logo.png',
        badge: '/shanthi_logo.png',
        tag: `test-instant-${Date.now()}`,
        requireInteraction: true,
        data: {
          destinationUrl: '/dashboard'
        }
      });
    }
  } catch (localErr) {
    console.warn('Local test banner notice:', localErr.message);
  }

  return res.data;
}

export default {
  isWebPushSupported,
  getVapidPublicKey,
  getPushSubscriptionStatus,
  subscribeToWebPush,
  unsubscribeFromWebPush,
  reconcilePushSubscription,
  triggerTestPush
};
