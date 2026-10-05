const { prisma } = require('./db');

/**
 * Stores a notification in the merchant's in-app feed and, if their phone
 * registered an Expo push token, pushes it to the lock screen as well.
 * Never throws — a failed push must never break the request that caused it.
 */
async function notify(userId, { type, title, body, orderId = null }) {
  try {
    const n = await prisma.notification.create({ data: { userId, type, title, body, orderId } });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true } });
    if (user?.pushToken) await sendPush(user.pushToken, { title, body, data: { type, orderId, notificationId: n.id } });
    return n;
  } catch (e) {
    console.error('notify failed', e);
    return null;
  }
}

async function sendPush(token, { title, body, data }) {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, data, sound: 'default', priority: 'high', channelId: 'orders' }),
    });
    const out = await res.json().catch(() => null);
    // The phone uninstalled the app or revoked permission — stop pushing to it.
    if (out?.data?.details?.error === 'DeviceNotRegistered') {
      await prisma.user.updateMany({ where: { pushToken: token }, data: { pushToken: null } });
    }
  } catch (e) {
    console.error('push failed', e);
  }
}

module.exports = { notify };
