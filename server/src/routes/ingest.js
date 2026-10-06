/*
 * Messages captured on the merchant's own phone (Android app, native side):
 *  - "notification": a customer message read from a WhatsApp / Instagram /
 *    Messenger / TikTok notification, sent automatically;
 *  - "capture": text the merchant copied, sent from the quick-settings tile
 *    or the text-selection menu.
 * The phone authenticates with its own long-lived capture key (not the
 * user's session tokens, which the native side can't read or refresh).
 * The analysis itself lives in services/messageIntake.js.
 */
const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { prisma } = require('../lib/db');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { intakeMessage } = require('../services/messageIntake');

const router = express.Router();
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
  const user = token && await prisma.user.findFirst({ where: { ingestTokenHash: sha256(token) } });
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

router.post('/message', rateLimit({ windowMs: 60 * 1000, max: 60 }), requireIngestKey, validate(messageSchema), async (req, res) => {
  const { source, sender, text, mode } = req.body;
  const out = await intakeMessage({ userId: req.user.id, source, sender, text });
  // Busy AI: the phone keeps the message and retries later.
  if (out.result === 'ai_busy') return res.status(503).json({ error: 'ai_busy' });
  if (out.result === 'not_order') return res.status(mode === 'capture' ? 422 : 200).json(out);
  res.status(out.result === 'created' ? 201 : 200).json(out);
});

module.exports = router;
