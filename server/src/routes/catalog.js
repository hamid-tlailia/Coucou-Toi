const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getCatalog } = require('../lib/catalog');

const router = express.Router();

// Store products (live from the website) for the order form's product picker.
router.get('/', requireAuth, async (req, res) => {
  res.json({ products: await getCatalog() });
});

module.exports = router;
