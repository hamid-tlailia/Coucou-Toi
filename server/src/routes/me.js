const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { passwordHash, providerSub, ...pub } = req.user;
  res.json({ ...pub, used: pub.quotaUsed, renews: pub.quotaResetAt });
});

module.exports = router;
