const express = require('express');
const { prisma } = require('../lib/db');
const { notify } = require('../lib/notify');
const { background } = require('../lib/background');

/**
 * Public order-tracking page — the link sent to the customer on WhatsApp.
 * Shows only what the customer already knows (their own order), never
 * other customers' data. Each open is recorded as a visit for the
 * merchant's dashboard; the first open also notifies the merchant.
 */
const router = express.Router();

const STEPS = [
  ['new', 'تم استلام الطلب'],
  ['processing', 'قيد التجهيز'],
  ['shipped', 'تم الشحن'],
  ['delivered', 'تم التسليم'],
];
const PAY = { paid: 'مدفوع', unpaid: 'غير مدفوع', cod: 'الدفع عند الاستلام' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `${Number(n).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ت`;

router.get('/:code', async (req, res) => {
  const order = await prisma.order.findUnique({ where: { code: req.params.code }, include: { user: { select: { store: true, storePhone: true } } } });
  if (!order) return res.status(404).send(page('غير موجود', '<p class="muted">لم يتم العثور على هذا الطلب.</p>'));

  const seenBefore = await prisma.visit.count({ where: { orderId: order.id, kind: 'tracking_page' } });
  await prisma.visit.create({ data: { userId: order.userId, kind: 'tracking_page', orderId: order.id } });
  if (!seenBefore) {
    background(notify(order.userId, {
      type: 'tracking_viewed',
      title: '👀 العميل فتح رابط التتبع',
      body: `${order.customer} شاهد حالة طلبه`,
      orderId: order.id,
    }));
  }

  const at = STEPS.findIndex(([k]) => k === order.status);
  const steps = STEPS.map(([, label], i) => `<li class="${i <= at ? 'done' : ''}"><span></span>${label}</li>`).join('');
  const body = `
    <div class="card">
      <div class="store">${esc(order.user.store)}</div>
      <div class="muted">طلب ${esc(order.code)}</div>
      <div class="hello">مرحباً ${esc(order.customer)} 👋</div>
      <ol class="steps">${steps}</ol>
      <div class="row"><span class="muted">المنتجات</span><b>${esc(order.items || '—')}</b></div>
      <div class="row"><span class="muted">الدفع</span><b>${PAY[order.pay]}</b></div>
      <div class="total">${money(order.total)}</div>
      ${order.user.storePhone ? `<a class="btn" href="https://wa.me/${esc(order.user.storePhone.replace(/\D/g, ''))}">تواصل مع المتجر</a>` : ''}
    </div>`;
  res.send(page(order.user.store || 'تتبع الطلب', body));
});

function page(title, body) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap">
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:Tajawal,Tahoma,sans-serif;background:radial-gradient(circle at 20% 0%,#2A1A2E,#0E0A10 60%);color:#F5EFE6;display:flex;align-items:center;justify-content:center;padding:18px}
.card{width:100%;max-width:420px;background:rgba(255,255,255,.04);border:1px solid rgba(212,175,106,.25);border-radius:24px;padding:26px}
.store{font-size:24px;font-weight:800;color:#E6C27A}.muted{color:#A89AA8;font-size:13px}.hello{font-size:18px;margin:18px 0 8px;font-weight:700}
.steps{list-style:none;padding:0;margin:18px 0}.steps li{display:flex;align-items:center;gap:12px;padding:9px 0;color:#7C6F7C}
.steps li span{width:14px;height:14px;border-radius:50%;border:2px solid #4A3A4C}.steps li.done{color:#F5EFE6}.steps li.done span{background:#D4AF6A;border-color:#D4AF6A;box-shadow:0 0 12px #D4AF6A88}
.row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px dashed rgba(255,255,255,.1)}
.total{font-size:28px;font-weight:800;text-align:center;margin-top:18px;color:#E6C27A}
.btn{display:block;text-align:center;margin-top:18px;padding:14px;border-radius:14px;background:linear-gradient(135deg,#E6C27A,#B68A4E);color:#1A1214;font-weight:800;text-decoration:none}
</style></head><body>${body}</body></html>`;
}

module.exports = router;
