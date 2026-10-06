import { Linking } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Clipboard from 'expo-clipboard';
import { orderMessage, waNumber } from './orderActions';
import { isSocial } from './contact';
import { markClipSeen } from './copiedMessage';
import Native from '../../modules/coucou-capture';

/**
 * Sends the order to the customer as an invoice picture (with its QR) plus
 * the tracking link. The customer keeps the picture: sent back later, it is
 * read in the Scan tab to pull the order up.
 *  - WhatsApp order with a number → that customer's chat, picture + caption;
 *  - Instagram / Messenger / TikTok → that app's share screen to pick the
 *    conversation (caption on the clipboard: those apps drop it);
 *  - manual order → the system share menu.
 * Returns 'chat' | 'app' | 'menu'.
 */
/** Web only (see sendInvoice.web.js). */
export const prepareInvoiceImage = () => {};

export async function sendInvoiceImage(viewRef, order, t) {
  const message = orderMessage(order, t);
  const phone = waNumber(order.phone);
  const target = isSocial(order.source) ? order.source : order.source === 'whatsapp' && phone ? 'whatsapp' : 'menu';

  if (!Native) { // no native module (iOS / old build): text with link only
    await Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
    return 'chat';
  }
  if (target !== 'whatsapp') {
    await Clipboard.setStringAsync(message);
    markClipSeen(message);
  }
  const path = await captureRef(viewRef, { format: 'png', quality: 1, result: 'tmpfile' });
  return Native.shareInvoice(path, target, phone, message);
}
