import Share from 'react-native-share';
import { captureRef } from 'react-native-view-shot';
import * as Clipboard from 'expo-clipboard';
import { orderMessage, waNumber } from './orderActions';
import { isSocial } from './contact';
import { markClipSeen } from './copiedMessage';
import { shortNo } from '../api/orders';

/**
 * Sends the order to the customer as an invoice picture (with its QR) and the
 * tracking link as caption. The customer keeps the picture: sent back later,
 * it is read in the Scan tab to pull the order up.
 * WhatsApp customers: straight into their chat. Messenger / Instagram /
 * TikTok: the share menu, with the caption also on the clipboard (those apps
 * drop the text of a shared picture).
 */
export async function sendInvoiceImage(viewRef, order, t) {
  const base64 = await captureRef(viewRef, { format: 'png', quality: 1, result: 'base64' });
  const url = `data:image/png;base64,${base64}`;
  const message = orderMessage(order, t);
  const filename = `invoice-${shortNo(order).slice(1)}`;

  if (!isSocial(order.source)) {
    for (const social of [Share.Social.WHATSAPP, Share.Social.WHATSAPPBUSINESS]) {
      try {
        await Share.shareSingle({ social, url, message, filename, type: 'image/png', whatsAppNumber: waNumber(order.phone) });
        return 'whatsapp';
      } catch { /* this WhatsApp isn't installed → next */ }
    }
  }
  await Clipboard.setStringAsync(message);
  markClipSeen(message);
  await Share.open({ url, message, filename, type: 'image/png', failOnCancel: false });
  return 'shared';
}
