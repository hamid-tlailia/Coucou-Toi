const { prisma } = require('./db');
const { getCatalog } = require('./catalog');
const { notify } = require('./notify');

const OPEN_STATUSES = ['new', 'processing'];
const SYNC_EVERY_MS = 3 * 60 * 1000;
let lastSync = 0;
let running = null;

const norm = (s) => String(s || '').toUpperCase().replace(/\s+/g, ' ');

/** Catalog products mentioned in a free-text "items" field. */
function productsIn(itemsText, catalog) {
  const text = norm(itemsText);
  if (!text) return [];
  return catalog.filter((p) => text.includes(norm(p.name)));
}

/** Names of sold-out products mentioned in an order/draft. */
function outOfStockIn(itemsText, catalog) {
  return productsIn(itemsText, catalog).filter((p) => !p.available).map((p) => p.name);
}

/** Adds `outOfStock: [names]` to serialized orders/drafts. */
async function annotate(list) {
  const catalog = await getCatalog();
  return list.map((o) => ({ ...o, outOfStock: outOfStockIn(o.items, catalog) }));
}

/**
 * Compares the website's current availability with the last known state and
 * notifies the merchant once per change (sold out / back in stock), with how
 * many open orders are affected. Throttled; safe to call on every poll.
 */
function syncStock({ force = false } = {}) {
  if (running) return running;
  if (!force && Date.now() - lastSync < SYNC_EVERY_MS) return Promise.resolve();
  lastSync = Date.now();
  running = (async () => {
    const catalog = await getCatalog();
    if (!catalog.length) return;
    const known = new Map((await prisma.productStock.findMany()).map((s) => [s.id, s]));
    const firstRun = known.size === 0;
    const changes = [];

    for (const p of catalog) {
      const prev = known.get(p.id);
      if (!prev) {
        await prisma.productStock.create({ data: { id: p.id, name: p.name, available: p.available } });
        // A product that appears already sold out is worth a heads-up too (not on first run).
        if (!firstRun && !p.available) changes.push({ p, now: false });
      } else if (prev.available !== p.available) {
        await prisma.productStock.update({ where: { id: p.id }, data: { available: p.available, name: p.name } });
        changes.push({ p, now: p.available });
      }
    }
    if (!changes.length) return;

    const users = await prisma.user.findMany({ select: { id: true } });
    for (const { p, now } of changes) {
      for (const u of users) {
        const affected = await prisma.order.count({
          where: { userId: u.id, status: { in: OPEN_STATUSES }, items: { contains: p.name, mode: 'insensitive' } },
        });
        await notify(u.id, now
          ? { type: 'back_in_stock', title: `✅ عاد للمخزون: ${p.name}`, body: affected ? `${affected} طلب ينتظر هذا العطر` : 'متوفر من جديد على الموقع' }
          : { type: 'out_of_stock', title: `⚠️ نفد العطر: ${p.name}`, body: affected ? `${affected} طلب مفتوح يحتوي عليه — نبّه العملاء` : 'لم يعد متوفراً على الموقع' });
      }
    }
  })()
    .catch((e) => console.error('stock sync failed', e))
    .finally(() => { running = null; });
  return running;
}

module.exports = { syncStock, annotate, outOfStockIn, productsIn };
