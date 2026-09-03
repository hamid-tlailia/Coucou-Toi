const express = require('express');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { JWT: GoogleJWT } = require('google-auth-library');

const { prisma } = require('../lib/db');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { SKU_MAP } = require('../lib/plans');

const router = express.Router();
router.use(requireAuth);

/* ============================================================
 * iOS — App Store Server API
 * The device sends us a transactionId. We never trust the client's claim
 * of what plan it bought; we ask Apple directly using our own signed
 * server-to-server JWT, and Apple's response is the only source of truth.
 * ============================================================ */

function appleServerJwt() {
  const key = fs.readFileSync(process.env.APPLE_PRIVATE_KEY_PATH, 'utf8');
  return jwt.sign({}, key, {
    algorithm: 'ES256',
    keyid: process.env.APPLE_KEY_ID,
    issuer: process.env.APPLE_ISSUER_ID,
    audience: 'appstoreconnect-v1',
    expiresIn: '5m',
    subject: process.env.APPLE_BUNDLE_ID,
  });
}

const APPLE_HOST = process.env.APPLE_ENVIRONMENT === 'Sandbox'
  ? 'https://api.storekit-sandbox.itunes.apple.com'
  : 'https://api.storekit.itunes.apple.com';

async function fetchAppleTransaction(transactionId) {
  const token = appleServerJwt();
  const res = await fetch(`${APPLE_HOST}/inApps/v1/transactions/${transactionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`apple_lookup_failed_${res.status}`);
  const body = await res.json();
  // signedTransactionInfo is a JWS; Apple's docs recommend verifying its
  // certificate chain. For brevity here we decode it — in production, use
  // Apple's official `app-store-server-library` package, which does full
  // X.509 chain verification against Apple's root CA.
  const [, payloadB64] = body.signedTransactionInfo.split('.');
  return JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
}

const iosSchema = z.object({
  transactionId: z.string().min(1),
  productId: z.string().min(1),
});

router.post('/apple/verify', validate(iosSchema), async (req, res) => {
  const mapping = SKU_MAP[req.body.productId];
  if (!mapping) return res.status(400).json({ error: 'unknown_product' });

  let txn;
  try {
    txn = await fetchAppleTransaction(req.body.transactionId);
  } catch {
    return res.status(502).json({ error: 'apple_verify_failed' });
  }

  if (txn.bundleId !== process.env.APPLE_BUNDLE_ID) return res.status(400).json({ error: 'bundle_mismatch' });
  if (txn.productId !== req.body.productId) return res.status(400).json({ error: 'product_mismatch' });
  if (txn.revocationDate) return res.status(400).json({ error: 'revoked' });

  const expiresAt = new Date(txn.expiresDate || Date.now());
  if (expiresAt < new Date()) return res.status(400).json({ error: 'expired' });

  await activateSubscription({
    userId: req.user.id,
    plan: mapping.plan,
    cycle: mapping.cycle,
    platform: 'ios',
    originalTxnId: txn.originalTransactionId,
    latestTxnId: txn.transactionId,
    expiresAt,
  });

  res.json({ ok: true, plan: mapping.plan });
});

/* ============================================================
 * Android — Google Play Developer API
 * ============================================================ */

async function playClient() {
  const creds = JSON.parse(fs.readFileSync(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, 'utf8'));
  const client = new GoogleJWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  await client.authorize();
  return client;
}

const androidSchema = z.object({
  purchaseToken: z.string().min(1),
  productId: z.string().min(1),
});

router.post('/google/verify', validate(androidSchema), async (req, res) => {
  const mapping = SKU_MAP[req.body.productId];
  if (!mapping) return res.status(400).json({ error: 'unknown_product' });

  const pkg = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/subscriptionsv2/tokens/${req.body.purchaseToken}`;

  let data;
  try {
    const client = await playClient();
    const resp = await client.request({ url });
    data = resp.data;
  } catch {
    return res.status(502).json({ error: 'google_verify_failed' });
  }

  const state = data.subscriptionState; // e.g. SUBSCRIPTION_STATE_ACTIVE
  if (!['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'].includes(state)) {
    return res.status(400).json({ error: 'not_active' });
  }
  const lineItem = data.lineItems?.[0];
  const expiresAt = new Date(lineItem?.expiryTime || Date.now());

  await activateSubscription({
    userId: req.user.id,
    plan: mapping.plan,
    cycle: mapping.cycle,
    platform: 'android',
    originalTxnId: data.startTime + ':' + req.body.purchaseToken.slice(0, 24),
    latestTxnId: req.body.purchaseToken,
    expiresAt,
  });

  res.json({ ok: true, plan: mapping.plan });
});

/* ---------------- restore ---------------- */

router.post('/restore', async (req, res) => {
  const sub = await prisma.subscription.findFirst({
    where: { userId: req.user.id, status: 'active', expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: 'desc' },
  });
  if (!sub) return res.status(404).json({ error: 'no_active_subscription' });
  await prisma.user.update({ where: { id: req.user.id }, data: { plan: sub.plan, cycle: sub.cycle } });
  res.json({ ok: true, plan: sub.plan });
});

/* ---------------- shared activation ---------------- */

async function activateSubscription({ userId, plan, cycle, platform, originalTxnId, latestTxnId, expiresAt }) {
  await prisma.$transaction([
    prisma.subscription.upsert({
      where: { originalTxnId },
      create: { userId, plan, cycle, platform, originalTxnId, latestTxnId, status: 'active', expiresAt },
      update: { latestTxnId, status: 'active', expiresAt },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { plan, cycle, quotaUsed: 0, quotaResetAt: expiresAt },
    }),
  ]);
}

module.exports = router;
