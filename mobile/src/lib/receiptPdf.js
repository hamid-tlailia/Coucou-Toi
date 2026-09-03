import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { qrSvgMarkup } from './QR';
import { formatTND } from './money';

/**
 * Builds the receipt HTML locally (no server round-trip needed for the PDF
 * itself — the QR just encodes the order id + tracking code) and hands it
 * to expo-print, which rasterizes with the OS's own WebView/PDFKit.
 */
export async function shareReceiptPdf({ order, store, t, deepLink }) {
  const svg = qrSvgMarkup(deepLink, 170);
  const row = (l, v) => `<tr><td class="l">${l}</td><td class="v">${v}</td></tr>`;
  const rtl = t.dir === 'rtl';

  const html = `<!doctype html><html dir="${t.dir}"><head><meta charset="utf-8" />
  <style>
    @page{size:80mm auto;margin:6mm}
    body{font-family:-apple-system,Tahoma,Arial,sans-serif;color:#241726;margin:0;padding:14px;text-align:center}
    h1{font-size:17px;margin:0;color:#4A2545}
    .sub{font-size:12px;color:#8A7A8C;margin-top:3px}
    .sep{border-top:1.5px dashed #D8CBDA;margin:14px 0}
    table{width:100%;border-collapse:collapse;font-size:12.5px}
    td{padding:5px 2px}
    td.l{color:#8A7A8C;text-align:${rtl ? 'right' : 'left'};white-space:nowrap;width:38%}
    td.v{font-weight:600;text-align:${rtl ? 'left' : 'right'}}
    .total{font-size:18px;font-weight:700;margin:10px 0}
    .code{font-size:12px;letter-spacing:1.5px;color:#8A7A8C;margin-top:8px}
    .foot{font-size:9.5px;color:#A99BAB;margin-top:14px}
  </style></head><body>
    <h1>${store}</h1>
    <div class="sub">${t.receipt} — #${order.id} · ${order.date}</div>
    <div class="sep"></div>
    <table>
      ${row(t.customer, order.customer)}
      ${row(t.phone, order.phone)}
      ${row(t.address, order.city)}
      ${row(t.products, order.items)}
      ${row(t.source, t[`src_${order.source}`])}
      ${row(t.payStatus, t[`pay_${order.pay}`])}
    </table>
    <div class="sep"></div>
    <div class="total">${formatTND(order.total)}</div>
    ${svg}
    <div class="code">${order.code}</div>
    <div class="foot">${t.scanHint}</div>
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${t.receipt} #${order.id}` });
  }
  return uri;
}
