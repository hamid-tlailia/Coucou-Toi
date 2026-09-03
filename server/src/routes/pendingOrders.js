const express = require('express');
const { z } = require('zod');
const { prisma } = require('../lib/db');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { withQuota } = require('../middleware/quota');
const { trackingCode } = require('../lib/tracking');
const { serialize: serializeOrder } = require('./orders');

const router = express.Router();
router.use(requireAuth);

/* AI-drafted orders waiting for the merchant's review, newest first. */
router.get('/', async (req, res) => {
  const status = req.query.status || 'pending';
  const pending = await prisma.pendingOrder.findMany({
    where: { userId: req.user.id, ...(status !== 'all' ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ pendingOrders: pending.map(serialize) });
});

/*
 * Approving a draft creates a real Order (own tracking code, own barcode)
 * and counts against the merchant's quota exactly like a manually-created
 * order — the AI just filled the form in, a human still confirms it.
 * The admin can correct any field the AI got wrong via `overrides` before
 * confirming.
 */
const approveSchema = z.object({
  customer: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(4).max(30).optional(),
  city: z.string().trim().max(120).optional(),
  items: z.string().trim().max(500).optional(),
  total: z.number().nonnegative().max(1_000_000).optional(),
  pay: z.enum(['paid', 'unpaid', 'cod']).optional(),
});

router.post('/:id/approve', validate(approveSchema), async (req, res) => {
  const draft = await prisma.pendingOrder.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!draft) return res.status(404).json({ error: 'not_found' });
  if (draft.status !== 'pending') return res.status(409).json({ error: 'already_reviewed' });

  const customer = req.body.customer ?? draft.customer;
  const phone = req.body.phone ?? draft.phone;
  const total = req.body.total ?? (draft.total != null ? Number(draft.total) : null);
  if (!customer || !phone || total == null) {
    return res.status(400).json({ error: 'missing_fields', details: 'customer, phone and total are required to approve' });
  }

  try {
    const { order, updatedDraft } = await withQuota(req.user.id, async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: req.user.id,
          customer,
          phone,
          city: req.body.city ?? draft.city ?? null,
          items: req.body.items ?? draft.items ?? null,
          total,
          source: draft.source,
          pay: req.body.pay ?? draft.pay ?? 'cod',
          code: '',
        },
      });
      const withCode = await tx.order.update({ where: { id: created.id }, data: { code: trackingCode(created.id) } });
      const updated = await tx.pendingOrder.update({
        where: { id: draft.id },
        data: { status: 'approved', approvedOrderId: withCode.id, reviewedAt: new Date() },
      });
      return { order: withCode, updatedDraft: updated };
    });
    res.status(201).json({ order: serializeOrder(order), pendingOrder: serialize(updatedDraft) });
  } catch (e) {
    if (e.status === 402) return res.status(402).json({ error: 'quota_exceeded' });
    throw e;
  }
});

router.post('/:id/reject', async (req, res) => {
  const draft = await prisma.pendingOrder.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!draft) return res.status(404).json({ error: 'not_found' });
  if (draft.status !== 'pending') return res.status(409).json({ error: 'already_reviewed' });

  const updated = await prisma.pendingOrder.update({
    where: { id: draft.id },
    data: { status: 'rejected', reviewedAt: new Date() },
  });
  res.json(serialize(updated));
});

function serialize(p) {
  return {
    id: p.id, source: p.source, customer: p.customer, phone: p.phone, city: p.city,
    address: p.address, items: p.items, total: p.total != null ? Number(p.total) : null,
    pay: p.pay, rawText: p.rawText, mediaUrl: p.mediaUrl, confidence: p.confidence,
    status: p.status, approvedOrderId: p.approvedOrderId, createdAt: p.createdAt.toISOString(),
  };
}

module.exports = router;
