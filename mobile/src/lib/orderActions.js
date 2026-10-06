import { Linking } from 'react-native';
import { fill } from '../i18n';
import { formatTND } from './money';
import { trackingUrl } from '../config';
import { shortNo } from '../api/orders';

/** Keeps phone numbers/codes left-to-right inside Arabic text (Unicode isolate). */
export const ltr = (s) => (s ? `\u2066${s}\u2069` : '');

/** Tunisian numbers are often typed without the country code. */
export function waNumber(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  return d.length === 8 ? `216${d}` : d;
}

/** The order summary sent to the customer, with the tracking link. */
export function orderMessage(order, t) {
  return fill(t.waMsg, {
    name: order.customer,
    no: shortNo(order),
    items: order.items || '',
    total: formatTND(order.total),
    link: trackingUrl(order.code),
  });
}

/** Opens the customer's WhatsApp chat. */
export const openWhatsApp = (order) => Linking.openURL(`https://wa.me/${waNumber(order.phone)}`);

export const callCustomer = (order) => Linking.openURL(`tel:${String(order.phone).replace(/[^\d+]/g, '')}`);

export function timeAgo(iso, t) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return t.timeAgoNow;
  if (s < 3600) return `${Math.floor(s / 60)} ${t.minutes}`;
  if (s < 86400) return `${Math.floor(s / 3600)} ${t.hours}`;
  return new Date(iso).toLocaleDateString();
}
