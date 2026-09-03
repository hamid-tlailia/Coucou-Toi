const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { z } = require('zod');
const { OAuth2Client } = require('google-auth-library');
const appleSignin = require('apple-signin-auth');
const rateLimit = require('express-rate-limit');

const { prisma } = require('../lib/db');
const { signAccessToken, newRefreshToken, hashRefreshToken } = require('../lib/jwt');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const googleClient = new OAuth2Client();

// Auth endpoints are the highest-value brute-force target — throttle harder
// than the rest of the API, keyed by IP.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
router.use(authLimiter);

function publicUser(u) {
  const { passwordHash, providerSub, ...pub } = u;
  return pub;
}

async function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const { raw, tokenHash, expiresAt } = newRefreshToken();
  await prisma.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
  res.json({ accessToken, refreshToken: raw, user: publicUser(user) });
}

/* ---------------- email/password ---------------- */

const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  store: z.string().trim().max(80).optional(),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(200),
});

router.post('/register', validate(registerSchema), async (req, res) => {
  const { name, store, email, password } = req.body;
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: 'email_taken' });

  // cost factor 12 — deliberately slow, tuned against brute force not user patience
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, store: store || name, email: email.toLowerCase(), passwordHash, provider: 'email' },
  });
  await issueSession(res, user);
});

const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(200),
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // Constant-shape response whether the email exists or not — don't leak which.
  const ok = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : await bcrypt.compare(password, '$2a$12$invalidsaltinvalidsaltinvalidsal');
  if (!user || !ok) return res.status(401).json({ error: 'invalid_credentials' });
  await issueSession(res, user);
});

/* ---------------- Google Sign-In ---------------- */

const googleSchema = z.object({ idToken: z.string().min(10) });

router.post('/google', validate(googleSchema), async (req, res) => {
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.idToken,
      audience: [process.env.GOOGLE_IOS_CLIENT_ID, process.env.GOOGLE_WEB_CLIENT_ID].filter(Boolean),
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'invalid_google_token' });
  }
  if (!payload.email_verified) return res.status(401).json({ error: 'email_not_verified' });

  const email = payload.email.toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { name: payload.name || email.split('@')[0], store: payload.name || email.split('@')[0], email, provider: 'google', providerSub: payload.sub },
    });
  } else if (!user.providerSub && user.provider === 'google') {
    user = await prisma.user.update({ where: { id: user.id }, data: { providerSub: payload.sub } });
  }
  await issueSession(res, user);
});

/* ---------------- Apple Sign-In ---------------- */
// Apple sends the user's name only on the FIRST authorization ever — the
// client passes it along here so we can store it before it's gone for good.

const appleSchema = z.object({
  identityToken: z.string().min(10),
  rawNonce: z.string().min(10),
  fullName: z.string().trim().max(120).nullable().optional(),
});

router.post('/apple', validate(appleSchema), async (req, res) => {
  let claims;
  try {
    claims = await appleSignin.verifyIdToken(req.body.identityToken, {
      audience: process.env.APPLE_BUNDLE_ID,
      nonce: crypto.createHash('sha256').update(req.body.rawNonce).digest('hex'),
      ignoreExpiration: false,
    });
  } catch {
    return res.status(401).json({ error: 'invalid_apple_token' });
  }

  // Apple relay emails still uniquely identify the user; `sub` is the durable id.
  const email = (claims.email || `${claims.sub}@privaterelay.appleid.com`).toLowerCase();
  let user = await prisma.user.findFirst({ where: { OR: [{ providerSub: claims.sub }, { email }] } });
  if (!user) {
    const name = req.body.fullName || email.split('@')[0];
    user = await prisma.user.create({
      data: { name, store: name, email, provider: 'apple', providerSub: claims.sub },
    });
  }
  await issueSession(res, user);
});

/* ---------------- refresh / logout ---------------- */

const refreshSchema = z.object({ refreshToken: z.string().min(20) });

router.post('/refresh', validate(refreshSchema), async (req, res) => {
  const tokenHash = hashRefreshToken(req.body.refreshToken);
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    // Reuse of an already-rotated/revoked token is a strong signal of theft —
    // nuke every session for that user as a precaution.
    if (record?.replacedBy) {
      await prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    return res.status(401).json({ error: 'invalid_refresh_token' });
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) return res.status(401).json({ error: 'invalid_refresh_token' });

  // Rotate: issue a new refresh token, mark the old one used-and-replaced.
  const { raw, tokenHash: newHash, expiresAt } = newRefreshToken();
  await prisma.$transaction([
    prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date(), replacedBy: newHash } }),
    prisma.refreshToken.create({ data: { userId: user.id, tokenHash: newHash, expiresAt } }),
  ]);

  res.json({ accessToken: signAccessToken(user), refreshToken: raw, user: publicUser(user) });
});

router.post('/logout', requireAuth, async (req, res) => {
  await prisma.refreshToken.updateMany({ where: { userId: req.user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  res.json({ ok: true });
});

module.exports = router;
