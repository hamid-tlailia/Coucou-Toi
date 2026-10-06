import { fill } from '../i18n';
import { getCatalog } from '../api/catalog';
import { messageCustomer } from './contact';

/** Message asking the customer: pick an available perfume, or wait? */
export async function stockMessage({ customer, outOfStock }, t) {
  const catalog = await getCatalog().catch(() => []);
  const available = catalog.filter((p) => p.available).map((p) => `• ${p.name}`).join('\n');
  return fill(t.stockMsg, {
    name: customer || '',
    items: outOfStock.join('، '),
    available: available || '—',
  });
}

/** Tells the customer, on the channel they wrote from (or WhatsApp). */
export async function sendStockNotice(order, t, via = order.source) {
  return messageCustomer(order, await stockMessage(order, t), via);
}
