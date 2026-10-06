/* eslint-env serviceworker */
/* Service worker of the home-screen app: shows pushed notifications (also
 * on the lock screen) and opens the app when one is tapped. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let p = {};
  try { p = event.data ? event.data.json() : {}; } catch { p = { title: 'Coucou Toi', body: event.data && event.data.text() }; }
  event.waitUntil((async () => {
    await self.registration.showNotification(p.title || 'Coucou Toi', {
      body: p.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: p.data || {},
      tag: p.data && p.data.notificationId,
    });
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    wins.forEach((w) => w.postMessage({ kind: 'push', data: p.data || {} }));
    if (navigator.setAppBadge) navigator.setAppBadge().catch(() => {});
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.length) {
      await wins[0].focus();
      wins[0].postMessage({ kind: 'tap', data });
    } else {
      await self.clients.openWindow(`/?n=${encodeURIComponent(JSON.stringify(data))}`);
    }
  })());
});
