const express = require('express');
const { prisma } = require('../lib/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// The app pings this once per cold start / return from background.
router.post('/', requireAuth, async (req, res) => {
  await prisma.visit.create({ data: { userId: req.user.id, kind: 'app_open' } });
  res.json({ ok: true });
});

module.exports = router;
