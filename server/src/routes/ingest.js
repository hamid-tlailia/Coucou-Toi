/*
 * Messages captured on the merchant's own phone (Android app, native side):
 *  - "notification": a customer message read from a WhatsApp / Instagram /
 *    Messenger / TikTok notification, sent automatically;
 *  - "capture": text the merchant copied, sent from the quick-settings tile
 *    or the text-selection menu.
 * The phone authenticates with its own long-lived capture key (not the
 * user's session tokens, which the native side can't read or refresh).
 * Follow-up messages from the same sender extend the same draft, so an
 * order typed over several messages ends up as one.
 */
const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { prisma } = require('../lib/db');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { extractOrder } = require('../services/aiPipeline');
const { notifyNewDraft } = require('./pendingOrders');

const router = express.Router();
const THREAD_WINDOW_MS = 60 * 60 * 1000;
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Issues (and replaces) the phone's capture key. Called by the app when
// notification capture is switched on.
router.post('/token', requireAuth, async (req, res) => {
  const token = crypto.randomBytes(32).toString('base64url');
  await prisma.user.update({ where: { id: req.user.id }, data: { ingestTokenHash: sha256(token) } });
  res.json({ token });
});

async function requireIngestKey(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const user = token && await prisma.user.findUnique({ where: { ingestTokenHash: sha256(token) } });
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  req.user = user;
  next();
}

const messageSchema = z.object({
  source: z.enum(['whatsapp', 'instagram', 'facebook', 'tiktok', 'manual']),
  sender: z.string().trim().max(120).optional(),
  text: z.string().trim().min(1).max(4000),
  mode: z.enum(['notification', 'capture']),
});

const phoneLike = (s) => {
  const d = String(s || '').replace(/[\s\-()+]/g, '');
  return /^\d{8,15}$/.test(d) ? d : null;
};

router.post('/message', rateLimit({ windowMs: 60 * 1000, max: 60 }), requireIngestKey, validate(messageSchema), async (req, res) => {
  const { source, sender, text, mode } = req.body;
  const userId = req.user.id;
  const threadKey = sender ? `${source}:${sender}`.slice(0, 200) : null;

  const open = threadKey && await prisma.pendingOrder.findFirst({
    where: { userId, threadKey, status: 'pending', lastMessageAt: { gte: new Date(Date.now() - THREAD_WINDOW_MS) } },
    orderBy: { createdAt: 'desc' },
  });
  const combined = open?.rawText ? `${open.rawText}\n${text}` : text;
  const hint = sender ? `(المرسل كما يظهر في التطبيق: ${sender})\n` : '';
  const draft = await extractOrder({ text: `${hint}${combined}` });

  // Busy AI: the phone keeps the message and retries later.
  if (draft.aiStatus !== 'ok') return res.status(503).json({ error: 'ai_busy' });

  if (open) {
    const pick = (k) => draft[k] ?? open[k];
    const updated = await prisma.pendingOrder.update({
      where: { id: open.id },
      data: {
        customer: pick('customer'), phone: pick('phone') ?? phoneLike(sender), city: pick('city'),
        address: pick('address'), items: pick('items'), total: pick('total'), pay: draft.pay || open.pay,
        confidence: draft.confidence, rawText: combined, lastMessageAt: new Date(),
      },
    });
    return res.json({ result: 'updated', id: updated.id });
  }

  if (!draft.isOrder) return res.status(mode === 'capture' ? 422 : 200).json({ result: 'not_order' });

  const pending = await prisma.pendingOrder.create({
    data: {
      userId, source, threadKey, lastMessageAt: new Date(),
      customer: draft.customer ?? (phoneLike(sender) ? null : sender || null),
      phone: draft.phone ?? phoneLike(sender),
      city: draft.city, address: draft.address, items: draft.items, total: draft.total,
      pay: draft.pay, rawText: combined, confidence: draft.confidence,
    },
  });
  await notifyNewDraft(pending);
  res.status(201).json({ result: 'created', id: pending.id });
});

module.exports = router;
