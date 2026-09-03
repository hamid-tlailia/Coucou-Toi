const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const { prisma } = require('../lib/db');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { withQuota } = require('../middleware/quota');

const router = express.Router();
router.use(requireAuth);

function trackingCode(id) {
  return `${id}-${crypto.randomInt(1000, 9999)}`;
}

/* ---------------- list + search ----------------
 * ?q= matches, in order of intent:
 *   1. exact tracking code / barcode payload
 *   2. exact order number
 *   3. partial, case-insensitive customer name
 * Always scoped to req.user.id — a user can never search another
 * merchant's orders, regardless of what q contains.
 */
router.get('/', async (req, res) => {
  const { q, status, source } = req.query;
  const where = { userId: req.user.id };
  if (status) where.status = status;
  if (source) where.source = source;

  if (q && String(q).trim()) {
    const term = String(q).trim();
    where.OR = [
      { code: term },
      { id: term },
      { customer: { contains: term, mode: 'insensitive' } },
    ];
  }

  const orders = await prisma.order.findMany({ where, orderBy: { date: 'desc' }, take: 200 });
  res.json({ orders: orders.map(serialize) });
});

router.get('/stats', async (req, res) => {
  const orders = await prisma.order.findMany({ where: { userId: req.user.id } });
  const revenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const collected = orders.filter((o) => o.pay === 'paid').reduce((s, o) => s + Number(o.total), 0);
  const bySource = {};
  const byStatus = {};
  for (const o of orders) {
    bySource[o.source] = bySource[o.source] || { count: 0, total: 0 };
    bySource[o.source].count++;
    bySource[o.source].total += Number(o.total);
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  }
  res.json({ revenue, collected, totalOrders: orders.length, bySource, byStatus });
});

// Exact lookup by tracking code (scanner flow) — scoped to the caller's own orders.
router.get('/lookup/:code', async (req, res) => {
  const order = await prisma.order.findFirst({ where: { userId: req.user.id, code: req.params.code } });
  if (!order) return res.status(404).json({ error: 'not_found' });
  res.json(serialize(order));
});

const createSchema = z.object({
  customer: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(4).max(30),
  city: z.string().trim().max(120).optional(),
  items: z.string().trim().max(500).optional(),
  total: z.number().nonnegative().max(1_000_000),
  source: z.enum(['whatsapp', 'instagram', 'facebook', 'tiktok', 'manual']),
  pay: z.enum(['paid', 'unpaid', 'cod']),
});

router.post('/', validate(createSchema), async (req, res) => {
  const idemKey = req.headers['idempotency-key'] || null;

  if (idemKey) {
    const dupe = await prisma.order.findUnique({ where: { userId_idemKey: { userId: req.user.id, idemKey } } });
    if (dupe) return res.status(200).json(serialize(dupe)); // safe replay, no double quota charge
  }

  try {
    const order = await withQuota(req.user.id, async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: req.user.id,
          customer: req.body.customer,
          phone: req.body.phone,
          city: req.body.city || null,
          items: req.body.items || null,
          total: req.body.total,
          source: req.body.source,
          pay: req.body.pay,
          idemKey,
          code: '', // placeholder, set below once we have the id
        },
      });
      return tx.order.update({ where: { id: created.id }, data: { code: trackingCode(created.id) } });
    });
    res.status(201).json(serialize(order));
  } catch (e) {
    if (e.status === 402) return res.status(402).json({ error: 'quota_exceeded' });
    throw e;
  }
});

const patchSchema = z.object({
  status: z.enum(['new', 'processing', 'shipped', 'delivered']).optional(),
  pay: z.enum(['paid', 'unpaid', 'cod']).optional(),
});

router.patch('/:id', validate(patchSchema), async (req, res) => {
  const existing = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!existing) return res.status(404).json({ error: 'not_found' });
  const updated = await prisma.order.update({ where: { id: existing.id }, data: req.body });
  res.json(serialize(updated));
});

function serialize(o) {
  return {
    id: o.id, customer: o.customer, phone: o.phone, city: o.city, items: o.items,
    total: Number(o.total), status: o.status, pay: o.pay, source: o.source,
    code: o.code, date: o.date.toISOString().slice(0, 10),
  };
}

module.exports = router;
