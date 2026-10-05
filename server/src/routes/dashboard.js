const express = require('express');
const { prisma } = require('../lib/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const TZ = process.env.STORE_TIMEZONE || 'Africa/Tunis';
const dayKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/**
 * Everything the admin dashboard shows, in one round-trip:
 * all-time KPIs, today / period comparisons, a per-day series for the
 * charts, breakdowns, top customers/cities, AI draft funnel and visits.
 * ?days= picks the chart window (7, 14 or 30).
 */
router.get('/', async (req, res) => {
  const userId = req.user.id;
  const days = [7, 14, 30].includes(Number(req.query.days)) ? Number(req.query.days) : 14;
  const now = new Date();
  // Fetch two windows so "this period vs previous period" can be compared.
  const since = new Date(now.getTime() - 2 * days * 86400000);

  const [all, paid, byStatus, bySource, recent, visits, drafts, unread] = await Promise.all([
    prisma.order.aggregate({ where: { userId }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { userId, pay: 'paid' }, _sum: { total: true } }),
    prisma.order.groupBy({ by: ['status'], where: { userId }, _count: true }),
    prisma.order.groupBy({ by: ['source'], where: { userId }, _count: true, _sum: { total: true } }),
    prisma.order.findMany({
      where: { userId, date: { gte: since } },
      select: { date: true, total: true, pay: true, customer: true, phone: true, city: true },
    }),
    prisma.visit.findMany({ where: { userId, createdAt: { gte: since } }, select: { kind: true, createdAt: true } }),
    prisma.pendingOrder.groupBy({ by: ['status'], where: { userId }, _count: true }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  // Per-day buckets for the current window.
  const series = [];
  const index = {};
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(new Date(now.getTime() - i * 86400000));
    index[key] = series.length;
    series.push({ day: key, orders: 0, revenue: 0, visits: 0, trackingViews: 0 });
  }
  const periodStart = new Date(now.getTime() - days * 86400000);
  const cur = { orders: 0, revenue: 0, visits: 0 };
  const prev = { orders: 0, revenue: 0, visits: 0 };
  const today = dayKey(now);
  const todayStats = { orders: 0, revenue: 0, visits: 0, trackingViews: 0 };
  const customers = {};
  const cities = {};

  for (const o of recent) {
    const total = Number(o.total);
    const bucket = o.date >= periodStart ? cur : prev;
    bucket.orders++;
    bucket.revenue += total;
    const k = dayKey(o.date);
    if (k in index) { series[index[k]].orders++; series[index[k]].revenue += total; }
    if (k === today) { todayStats.orders++; todayStats.revenue += total; }
    if (o.date >= periodStart) {
      const ck = o.phone || o.customer;
      customers[ck] = customers[ck] || { name: o.customer, phone: o.phone, orders: 0, total: 0 };
      customers[ck].orders++;
      customers[ck].total += total;
      if (o.city) {
        const c = o.city.trim();
        cities[c] = cities[c] || { city: c, orders: 0, total: 0 };
        cities[c].orders++;
        cities[c].total += total;
      }
    }
  }
  for (const v of visits) {
    const bucket = v.createdAt >= periodStart ? cur : prev;
    bucket.visits++;
    const k = dayKey(v.createdAt);
    const field = v.kind === 'tracking_page' ? 'trackingViews' : 'visits';
    if (k in index) series[index[k]][field]++;
    if (k === today) todayStats[field]++;
  }

  const revenue = Number(all._sum.total || 0);
  const collected = Number(paid._sum.total || 0);
  const count = (arr, key) => Object.fromEntries(arr.map((r) => [r[key], r._count]));

  res.json({
    days,
    kpis: {
      revenue,
      collected,
      outstanding: revenue - collected,
      totalOrders: all._count,
      avgOrder: all._count ? revenue / all._count : 0,
    },
    today: todayStats,
    period: { current: cur, previous: prev },
    series,
    byStatus: count(byStatus, 'status'),
    bySource: Object.fromEntries(bySource.map((r) => [r.source, { count: r._count, total: Number(r._sum.total || 0) }])),
    topCustomers: Object.values(customers).sort((a, b) => b.total - a.total).slice(0, 5),
    topCities: Object.values(cities).sort((a, b) => b.orders - a.orders).slice(0, 5),
    drafts: count(drafts, 'status'),
    visits: {
      appOpens: series.reduce((s, d) => s + d.visits, 0),
      trackingViews: series.reduce((s, d) => s + d.trackingViews, 0),
    },
    unreadNotifications: unread,
  });
});

module.exports = router;
