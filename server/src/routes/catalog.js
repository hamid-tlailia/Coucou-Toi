const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getCatalog } = require('../lib/catalog');
const { syncStock } = require('../lib/stock');
const { background } = require('../lib/background');

const router = express.Router();

// Store products (live from the website) for the order form's product picker.
router.get('/', requireAuth, async (req, res) => {
  background(syncStock());
  res.json({ products: await getCatalog() });
});

// Daily backup check (Vercel Cron), in case the app isn't opened for a while.
router.get('/cron', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.sendStatus(401);
  await syncStock({ force: true });
  res.json({ ok: true });
});

module.exports = router;
