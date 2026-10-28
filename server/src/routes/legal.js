/*
 * Public privacy-policy and data-deletion pages. Meta requires both URLs in
 * the app settings before App Review / switching the app to Live.
 */
const express = require('express');

const router = express.Router();

const STORE = 'Coucou Toi — ARONA';
const contact = () => process.env.CONTACT_EMAIL
  ? `<a href="mailto:${process.env.CONTACT_EMAIL}">${process.env.CONTACT_EMAIL}</a>`
  : 'a message to our Facebook / Instagram page ARONA';
const contactAr = () => process.env.CONTACT_EMAIL
  ? `<a href="mailto:${process.env.CONTACT_EMAIL}">${process.env.CONTACT_EMAIL}</a>`
  : 'رسالة إلى صفحتنا ARONA على فيسبوك أو انستغرام';

const page = (title, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — ${STORE}</title>
<style>
  body { font: 16px/1.7 system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 760px; margin: 0 auto; padding: 24px 16px 48px; color: #222; background: #fff; }
  h1 { font-size: 26px; margin-bottom: 4px; } h2 { font-size: 19px; margin-top: 28px; }
  .muted { color: #777; font-size: 14px; } hr { margin: 40px 0; border: 0; border-top: 1px solid #ddd; }
  [dir=rtl] { text-align: right; }
</style></head><body>${body}</body></html>`;

router.get('/privacy', (req, res) => {
  res.type('html').send(page('Privacy Policy', `
<h1>Privacy Policy</h1>
<p class="muted">${STORE} · Last updated: October 2026</p>
<p>This policy explains how ${STORE} (“we”) handles information when you message our Facebook page, Instagram account or WhatsApp number to place an order.</p>
<h2>What we collect</h2>
<p>Only what you send us in a message: your name as shown on the platform, your platform user ID, the text, photos or voice notes of your message, and the order details you give (phone number, city, delivery address, products).</p>
<h2>How we use it</h2>
<p>Solely to prepare, deliver and follow up your order: to create an order draft that our staff review, to send you your invoice and tracking link, and to notify you of your order status. Message text may be processed by an AI service (Google Gemini) to extract the order details automatically.</p>
<h2>Sharing</h2>
<p>We do not sell or rent your information and do not use it for advertising. It is shared only with the delivery company handling your order and with the service providers that host our system (Vercel, Neon, Google), under their own security terms.</p>
<h2>Retention</h2>
<p>Order records are kept as long as needed for delivery, returns and our accounting obligations. Unreviewed message drafts are deleted when rejected.</p>
<h2>Your rights and deletion</h2>
<p>You may ask to see, correct or delete your information at any time — see our <a href="/data-deletion">data deletion instructions</a>, or send ${contact()}.</p>
<hr>
<div dir="rtl" lang="ar">
<h1>سياسة الخصوصية</h1>
<p>عندما تراسل صفحتنا على فيسبوك أو انستغرام أو واتساب لطلب منتج، نستعمل فقط ما ترسله لنا (اسمك، رسالتك، رقم الهاتف، المدينة والعنوان، والمنتجات) لتحضير طلبك وتوصيله وإرسال الفاتورة ورابط التتبع. قد يُحلَّل نص الرسالة بخدمة ذكاء اصطناعي (Google Gemini) لاستخراج تفاصيل الطلب. لا نبيع بياناتك ولا نستعملها للإعلانات، ولا نشاركها إلا مع شركة التوصيل ومزودي الاستضافة. يمكنك طلب حذف بياناتك في أي وقت عبر ${contactAr()}.</p>
</div>`));
});

router.get('/data-deletion', (req, res) => {
  res.type('html').send(page('Data Deletion', `
<h1>Data Deletion Instructions</h1>
<p class="muted">${STORE}</p>
<p>To delete the information we hold about you (your messages and orders):</p>
<ol>
  <li>Send ${contact()} with the words <b>“delete my data”</b>.</li>
  <li>Mention the name or phone number used for your orders.</li>
</ol>
<p>We delete your messages and personal details within 30 days and confirm by reply. Records we must keep by law (invoices) are kept anonymised.</p>
<hr>
<div dir="rtl" lang="ar">
<h1>حذف البيانات</h1>
<p>لحذف بياناتك (رسائلك وطلباتك)، أرسل ${contactAr()} تكتب فيها <b>«احذف بياناتي»</b> مع الاسم أو رقم الهاتف المستعمل في الطلبات. نحذفها خلال 30 يوماً ونؤكد لك ذلك.</p>
</div>`));
});

module.exports = router;
