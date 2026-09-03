const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_TTL = '15m';     // short-lived — limits damage if one leaks
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function signAccessToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET); // throws on expiry/tamper
}

function newRefreshToken() {
  const raw = crypto.randomBytes(48).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, tokenHash, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) };
}

function hashRefreshToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = { signAccessToken, verifyAccessToken, newRefreshToken, hashRefreshToken };
