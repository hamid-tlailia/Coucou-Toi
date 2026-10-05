import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { qrSvgMarkup } from './QR';
import { formatTND } from './money';
import { trackingUrl } from '../config';
import { shortNo } from '../api/orders';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Numbers/codes/phones stay left-to-right inside Arabic text.
const ltr = (s) => `<bdi dir="ltr">${esc(s)}</bdi>`;

const STAMP = { paid: '#2F9E6B', unpaid: '#D0564C', cod: '#B68A4E' };

/**
 * Invoice HTML, rendered to PDF on the device by the OS print engine.
 * The QR encodes the public tracking link: the customer scans it to follow
 * the order, the merchant scans it in the app to mark it paid/delivered.
 */
export function invoiceHtml({ order, user, t }) {
  const rtl = t.dir === 'rtl';
  const qr = qrSvgMarkup(trackingUrl(order.code), 132, '#1C1418');
  const items = String(order.items || '—').split(/\n|،|,|\+/).map((s) => s.trim()).filter(Boolean);
  const rows = items.map((it, i) => `
    <tr><td class="n">${i + 1}</td><td>${esc(it)}</td><td class="amt">${items.length === 1 ? formatTND(order.total) : ''}</td></tr>`).join('');
  const date = new Date(order.createdAt || order.date).toLocaleDateString(rtl ? 'ar-TN' : 'fr-TN', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!doctype html><html dir="${t.dir}"><head><meta charset="utf-8"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&family=Playfair+Display:wght@700&display=swap">
<style>
  @page { size: A5; margin: 0 }
  * { box-sizing: border-box }
  body { margin: 0; font-family: Tajawal, Tahoma, Arial, sans-serif; color: #1C1418; background: #fff }
  .page { padding: 28px 30px; min-height: 100vh; position: relative }
  .band { position: absolute; top: 0; left: 0; right: 0; height: 8px; background: linear-gradient(90deg,#F0D49A,#D4AF6A,#A87D3E) }
  .head { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 10px }
  .brand { font-family: 'Playfair Display', Tajawal, serif; font-size: 26px; color: #2A1830; font-weight: 700 }
  .brand-sub { font-size: 11px; color: #8A7A84; margin-top: 4px; line-height: 1.6 }
  .inv { text-align: ${rtl ? 'left' : 'right'} }
  .inv .label { font-size: 11px; letter-spacing: 2px; color: #A87D3E; font-weight: 800 }
  .inv .no { font-size: 20px; font-weight: 800; margin-top: 2px }
  .inv .date { font-size: 11px; color: #8A7A84; margin-top: 2px }
  .grid { display: flex; gap: 16px; margin-top: 22px }
  .box { flex: 1; background: #FAF6F0; border: 1px solid #EFE5D6; border-radius: 12px; padding: 12px 14px }
  .box .k { font-size: 10px; color: #A87D3E; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px }
  .box .v { font-size: 13px; font-weight: 700; line-height: 1.6 }
  .box .s { font-size: 11.5px; color: #6E6170; line-height: 1.6 }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px }
  th { background: #2A1830; color: #F0D49A; font-size: 10.5px; letter-spacing: 1px; padding: 9px 10px; text-align: ${rtl ? 'right' : 'left'} }
  th:first-child { border-radius: ${rtl ? '0 10px 10px 0' : '10px 0 0 10px'} } th:last-child { border-radius: ${rtl ? '10px 0 0 10px' : '0 10px 10px 0'} }
  td { padding: 10px; border-bottom: 1px solid #F1EAE0 }
  td.n { width: 28px; color: #A89AA5 } td.amt, th.amt { text-align: ${rtl ? 'left' : 'right'}; white-space: nowrap; font-weight: 700 }
  .foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 22px }
  .total { background: linear-gradient(135deg,#2A1830,#4A2A4F); color: #fff; border-radius: 14px; padding: 14px 20px; min-width: 190px }
  .total .k { font-size: 11px; color: #F0D49A; letter-spacing: 1px; font-weight: 800 }
  .total .v { font-size: 26px; font-weight: 800; margin-top: 2px }
  .stamp { display: inline-block; margin-top: 12px; border: 2px solid ${STAMP[order.pay]}; color: ${STAMP[order.pay]}; padding: 5px 14px; border-radius: 8px; font-weight: 800; font-size: 13px; transform: rotate(-4deg) }
  .qr { text-align: center } .qr .h { font-size: 10px; color: #8A7A84; margin-top: 4px }
  .thanks { text-align: center; margin-top: 26px; font-size: 13px; color: #6E6170 }
  .line { height: 1px; background: linear-gradient(90deg,transparent,#D4AF6A,transparent); margin-top: 14px }
</style></head><body><div class="page"><div class="band"></div>
  <div class="head">
    <div>
      <div class="brand">${esc(user.store || user.name)}</div>
      <div class="brand-sub">${[user.storePhone && ltr(user.storePhone), user.storeAddress && esc(user.storeAddress)].filter(Boolean).join('<br/>')}</div>
    </div>
    <div class="inv">
      <div class="label">${esc(t.invoiceNo).toUpperCase()}</div>
      <div class="no">${ltr(shortNo(order))}</div>
      <div class="date">${esc(date)}</div>
    </div>
  </div>
  <div class="grid">
    <div class="box"><div class="k">${esc(t.billTo)}</div><div class="v">${esc(order.customer)}</div><div class="s">${ltr(order.phone)}<br/>${esc(order.city || '')}</div></div>
    <div class="box"><div class="k">${esc(t.status)}</div><div class="v">${esc(t[`st_${order.status}`])}</div><div class="s">${esc(t.source)}: ${esc(t[`src_${order.source}`])}</div></div>
  </div>
  <table><thead><tr><th>#</th><th>${esc(t.description)}</th><th class="amt">${esc(t.amount)}</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="foot">
    <div>
      <div class="total"><div class="k">${esc(t.total)}</div><div class="v">${esc(formatTND(order.total))}</div></div>
      <div class="stamp">${esc(t[`pay_${order.pay}`])}</div>
    </div>
    <div class="qr">${qr}<div class="h">${esc(t.scanToTrack)}</div></div>
  </div>
  <div class="line"></div>
  <div class="thanks">${esc(t.thanks)}</div>
</div></body></html>`;
}

export async function shareInvoicePdf(args) {
  const { uri } = await Print.printToFileAsync({ html: invoiceHtml(args), width: 420, height: 595 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `${args.t.invoice} ${shortNo(args.order)}` });
  }
  return uri;
}

export const printInvoice = (args) => Print.printAsync({ html: invoiceHtml(args) });
