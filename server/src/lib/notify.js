const { JWT } = require('google-auth-library');
const { prisma } = require('./db');

/**
 * Stores a notification in the merchant's in-app feed and, if their phone
 * registered a push token, pushes it to the lock screen as well.
 * Never throws — a failed push must never break the request that caused it.
 *
 * Token kinds:
 *  - "ExponentPushToken[...]" → Expo push service (iOS builds made with EAS)
 *  - anything else            → a native FCM token, sent directly through
 *    Firebase Cloud Messaging with the service account in
 *    FIREBASE_SERVICE_ACCOUNT (no Expo account needed)
 */
async function notify(userId, { type, title, body, orderId = null }) {
  try {
    const n = await prisma.notification.create({ data: { userId, type, title, body, orderId } });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true } });
    if (user?.pushToken) {
      const payload = { title, body, data: { type, orderId, notificationId: n.id } };
      if (user.pushToken.startsWith('ExponentPushToken')) await sendExpo(user.pushToken, payload);
      else await sendFcm(user.pushToken, payload);
    }
    return n;
  } catch (e) {
    console.error('notify failed', e);
    return null;
  }
}

const forgetToken = (token) => prisma.user.updateMany({ where: { pushToken: token }, data: { pushToken: null } });

async function sendExpo(token, { title, body, data }) {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, data, sound: 'default', priority: 'high', channelId: 'orders' }),
    });
    const out = await res.json().catch(() => null);
    if (out?.data?.details?.error === 'DeviceNotRegistered') await forgetToken(token);
  } catch (e) {
    console.error('expo push failed', e);
  }
}

let fcm = null;
function fcmClient() {
  if (fcm || !process.env.FIREBASE_SERVICE_ACCOUNT) return fcm;
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  fcm = {
    projectId: sa.project_id,
    jwt: new JWT({ email: sa.client_email, key: sa.private_key, scopes: ['https://www.googleapis.com/auth/firebase.messaging'] }),
  };
  return fcm;
}

async function sendFcm(token, { title, body, data }) {
  try {
    const client = fcmClient();
    if (!client) return console.warn('FIREBASE_SERVICE_ACCOUNT not set — skipping push');
    const { token: accessToken } = await client.jwt.getAccessToken();
    // FCM data values must be strings.
    const strData = Object.fromEntries(Object.entries(data).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${client.projectId}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: strData,
          android: { priority: 'HIGH', notification: { channel_id: 'orders', sound: 'default' } },
        },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('fcm push failed', res.status, err.slice(0, 300));
      if (res.status === 404 || err.includes('UNREGISTERED')) await forgetToken(token);
    }
  } catch (e) {
    console.error('fcm push failed', e);
  }
}

module.exports = { notify };
