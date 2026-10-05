const express = require('express');
const { z } = require('zod');
const { prisma } = require('../lib/db');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(requireAuth);

function publicMe(u) {
  const { passwordHash, providerSub, pushToken, ...pub } = u;
  return { ...pub, used: pub.quotaUsed, renews: pub.quotaResetAt };
}

router.get('/', (req, res) => res.json(publicMe(req.user)));

// Store details printed on invoices and on the public tracking page.
const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  store: z.string().trim().min(1).max(80).optional(),
  storePhone: z.string().trim().max(30).nullable().optional(),
  storeAddress: z.string().trim().max(200).nullable().optional(),
});

router.patch('/', validate(patchSchema), async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.user.id }, data: req.body });
  res.json(publicMe(user));
});

module.exports = router;
