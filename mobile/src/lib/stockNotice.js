import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { fill } from '../i18n';
import { getCatalog } from '../api/catalog';
import { waNumber } from './orderActions';

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

// Inbox of each platform (no way to open a specific chat without its id).
const APP_LINKS = {
  instagram: ['instagram://direct-inbox', 'https://www.instagram.com/direct/inbox/'],
  facebook: ['fb-messenger://', 'https://www.messenger.com/'],
  tiktok: ['snssdk1233://', 'https://www.tiktok.com/messages'],
};

async function openFirst(urls) {
  for (const u of urls) {
    try { await Linking.openURL(u); return true; } catch { /* app not installed → next */ }
  }
  return false;
}

/**
 * Sends the notice where the customer wrote from: WhatsApp opens the chat
 * with the message ready; Instagram / Messenger / TikTok copy the message and
 * open the app's inbox so it only needs pasting.
 * Returns 'whatsapp' | 'copied'.
 */
export async function sendStockNotice(order, t, via = order.source) {
  const msg = await stockMessage(order, t);
  if ((via === 'whatsapp' || !APP_LINKS[via]) && order.phone) {
    await Linking.openURL(`https://wa.me/${waNumber(order.phone)}?text=${encodeURIComponent(msg)}`);
    return 'whatsapp';
  }
  await Clipboard.setStringAsync(msg);
  if (APP_LINKS[via]) await openFirst(APP_LINKS[via]);
  return 'copied';
}
