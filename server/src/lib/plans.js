// Source of truth for quota + entitlements. Mirrors mobile/src/config.js —
// but THIS copy is what actually gets enforced, since the client's copy
// could be edited by anyone who decompiles the app.
const PLANS = {
  free:     { quota: 10,   price: 0,   priceY: 0 },
  starter:  { quota: 150,  price: 29,  priceY: 290 },
  growth:   { quota: 750,  price: 75,  priceY: 750 },
  business: { quota: 2500, price: 150, priceY: 1500 },
};

// Private build (shared directly, not via the stores): no paywall, no limit.
const PRIVATE_MODE = process.env.PRIVATE_MODE !== 'false';
const UNLIMITED = { quota: Infinity, price: 0, priceY: 0 };

const planOf = (id) => (PRIVATE_MODE ? UNLIMITED : PLANS[id] || PLANS.free);

// Apple/Google product ids -> our internal plan id + cycle.
const SKU_MAP = {
  'com.cocolove.orders.starter.monthly':  { plan: 'starter',  cycle: 'monthly' },
  'com.cocolove.orders.growth.monthly':   { plan: 'growth',   cycle: 'monthly' },
  'com.cocolove.orders.business.monthly': { plan: 'business', cycle: 'monthly' },
  'com.cocolove.orders.starter.yearly':   { plan: 'starter',  cycle: 'yearly' },
  'com.cocolove.orders.growth.yearly':    { plan: 'growth',   cycle: 'yearly' },
  'com.cocolove.orders.business.yearly':  { plan: 'business', cycle: 'yearly' },
};

module.exports = { PLANS, planOf, SKU_MAP, PRIVATE_MODE };
