const express = require('express');
const { z } = require('zod');
const { prisma } = require('../lib/db');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { notify } = require('../lib/notify');
const { syncStock } = require('../lib/stock');
const { background } = require('../lib/background');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  background(syncStock()); // website stock changes → notifications (throttled)
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 60 }),
    prisma.notification.count({ where: { userId: req.user.id, readAt: null } }),
  ]);
  res.json({
    unread,
    notifications: items.map((n) => ({
      id: n.id, type: n.type, title: n.title, body: n.body, orderId: n.orderId,
      read: !!n.readAt, createdAt: n.createdAt.toISOString(),
    })),
  });
});

router.post('/read-all', async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
  res.json({ ok: true });
});

router.post('/:id/read', async (req, res) => {
  await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
  res.json({ ok: true });
});

const tokenSchema = z.object({ token: z.string().trim().max(4096).nullable() });

// Called by the app after the user grants notification permission.
router.put('/push-token', validate(tokenSchema), async (req, res) => {
  // A phone belongs to one account at a time — detach it from anyone else first.
  if (req.body.token) {
    await prisma.user.updateMany({ where: { pushToken: req.body.token, NOT: { id: req.user.id } }, data: { pushToken: null } });
  }
  await prisma.user.update({ where: { id: req.user.id }, data: { pushToken: req.body.token } });
  res.json({ ok: true });
});

// "Send a test notification" button in Settings.
// Home-screen web app (iPhone): the key to subscribe with, and the subscription.
router.get('/vapid-key', (req, res) => res.json({ key: process.env.VAPID_PUBLIC_KEY || null }));

const webPushSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(1000),
    keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
  }).nullable(),
});

router.put('/web-push', validate(webPushSchema), async (req, res) => {
  const sub = req.body.subscription;
  await prisma.user.update({ where: { id: req.user.id }, data: { webPushSub: sub ? JSON.stringify(sub) : null } });
  res.json({ ok: true });
});

router.post('/test', async (req, res) => {
  await notify(req.user.id, { type: 'test', title: '🔔 Coucou Toi', body: 'الإشعارات تعمل بنجاح ✨' });
  res.json({ ok: true, push: !!req.user.pushToken });
});

module.exports = router;
