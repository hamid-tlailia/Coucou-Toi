/* eslint-env browser */
import { getVapidKey, saveWebPush } from '../api/account';

/*
 * Notifications for the home-screen web app (iPhone, iOS 16.4+): Web Push
 * through the service worker in public/sw.js, so they reach the lock screen
 * even with the app closed. Same API as push.js (native).
 */

const supported = () => typeof window !== 'undefined'
  && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

let registration = null;
async function sw() {
  if (!registration) registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return registration;
}

function urlB64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * 'push' – lock-screen notifications work; 'local' – only while the app is
 * open (not installed on the home screen, or no server key); 'denied'.
 * On iPhone it must run from a tap (Settings → notifications).
 */
export async function registerForNotifications(fromTap = false) {
  if (!supported()) return 'local';
  let perm = Notification.permission;
  if (perm === 'default' && !fromTap) return 'local'; // wait for the tap in Settings
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';
  try {
    const reg = await sw();
    const { key } = await getVapidKey();
    if (!key) return 'local';
    const sub = (await reg.pushManager.getSubscription())
      || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(key) });
    await saveWebPush(sub.toJSON());
    return 'push';
  } catch (e) {
    console.warn('web push unavailable', e?.message);
    return 'local';
  }
}

/** Shown by the app itself (while open, when a new notification is polled). */
export async function showLocalNotification({ title, body, data }) {
  if (!supported() || Notification.permission !== 'granted' || !document.hidden) return;
  try { (await sw()).showNotification(title, { body, data, icon: '/icons/icon-192.png' }); } catch { /* ignore */ }
}

function onMessage(kind, fn) {
  if (!supported()) return { remove() {} };
  const handler = (e) => { if (e.data?.kind === kind) fn(e.data.data || {}); };
  navigator.serviceWorker.addEventListener('message', handler);
  return { remove: () => navigator.serviceWorker.removeEventListener('message', handler) };
}

export function onNotificationTap(fn) {
  // Opened from a notification while the app was closed: data comes in the URL.
  try {
    const n = new URLSearchParams(window.location.search).get('n');
    if (n) {
      window.history.replaceState(null, '', '/');
      setTimeout(() => fn(JSON.parse(n)), 500);
    }
  } catch { /* ignore */ }
  return onMessage('tap', fn);
}

export const onNotificationReceived = (fn) => onMessage('push', fn);

export function setBadge(n) {
  try {
    if (n > 0) navigator.setAppBadge?.(n);
    else navigator.clearAppBadge?.();
  } catch { /* unsupported */ }
}
