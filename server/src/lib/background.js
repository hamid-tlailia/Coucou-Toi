const { waitUntil } = require('@vercel/functions');

/**
 * Runs work after the response has been sent. On Vercel the function would
 * otherwise be frozen as soon as the response goes out; elsewhere this is
 * just a fire-and-forget promise.
 */
function background(promise) {
  const p = Promise.resolve(promise).catch((e) => console.error('background task failed', e));
  try { waitUntil(p); } catch { /* not on Vercel */ }
  return p;
}

module.exports = { background };
