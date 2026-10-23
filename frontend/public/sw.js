// public/sw.js - Shanthi Ayurvedas CRM Web Push Service Worker (RFC 8030 / RFC 8292)
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 1. Listen for incoming push packets from Push Gateways (FCM / Mozilla / Apple)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_e) {
      data = {
        title: 'Shanthi Ayurvedas CRM Alert',
        body: event.data.text()
      };
    }
  }

  const title = data.title || 'Shanthi Ayurvedas Alert';
  const destinationUrl = data.link || data.url || '/';

  // Base options for maximum visibility across Windows, macOS, and Android
  // Note: Chrome & Windows Action Center require raster image format (PNG/WebP/JPEG) for icon & badge.
  const iconUrl = data.icon && !data.icon.endsWith('.svg') ? data.icon : '/shanthi_logo.png';
  const badgeUrl = '/shanthi_logo.png';

  const options = {
    body: data.body || '',
    icon: iconUrl,
    badge: badgeUrl,
    tag: data.tag || data.eventId || `push-${Date.now()}`, // Avoids duplicate banners
    renotify: true,
    requireInteraction: true, // Banner stays visible on screen until user dismisses or clicks
    vibrate: [250, 100, 250, 100, 250], // Heads-up vibration pattern for mobile Android
    data: {
      destinationUrl,
      timestamp: Date.now(),
      ...data
    }
  };

  // Deliver Native OS Notification Banner with resilient fallback
  const showNotificationPromise = self.registration
    .showNotification(title, options)
    .catch((err) => {
      console.warn('Primary notification display failed, retrying without media attributes:', err);
      return self.registration.showNotification(title, {
        body: data.body || '',
        tag: data.tag || `push-fallback-${Date.now()}`,
        requireInteraction: true
      });
    });

  // Broadcast to all open CRM browser tabs so UI updates immediately in real-time
  const broadcastPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'PUSH_NOTIFICATION_RECEIVED',
        payload: {
          title,
          body: data.body,
          destinationUrl,
          data
        }
      });
    });
  });

  event.waitUntil(Promise.all([showNotificationPromise, broadcastPromise]));
});

// 2. Handle user click on native OS notification banner
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawDestination = event.notification.data?.destinationUrl || '/';
  const targetUrl = new URL(rawDestination, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a CRM tab is already open, focus it and navigate to the target URL
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && client.url !== targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If no tab is open, open a new window to the destination URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
