// Minimal service worker for real Web Push. Only handles push delivery and
// notification clicks - no offline caching/PWA behavior is implemented.

self.addEventListener('push', (event) => {
  let payload = { title: 'Zoom Booking Portal', body: 'You have a notification.' };
  try {
    if (event.data) payload = event.data.json();
  } catch (e) {
    // ignore malformed payloads
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
