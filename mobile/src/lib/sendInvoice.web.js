/* eslint-env browser */
import { captureRef } from 'react-native-view-shot';
import * as Clipboard from 'expo-clipboard';
import { orderMessage, waNumber } from './orderActions';
import { shortNo } from '../api/orders';

/*
 * Web app (iPhone): the invoice picture + message go through the iPhone's
 * share sheet (WhatsApp, Instagram, Messenger… then the customer's chat).
 * Safari only opens the share sheet right after a tap, so the picture is
 * prepared as soon as the invoice is shown.
 */

let ready = null;

/** Renders the invoice picture ahead of the tap. */
export function prepareInvoiceImage(viewRef, order) {
  ready = {
    id: order.id,
    file: captureRef(viewRef, { format: 'png', quality: 1, result: 'data-uri' })
      .then((uri) => fetch(uri))
      .then((r) => r.blob())
      .then((b) => new File([b], `invoice-${shortNo(order).slice(1)}.png`, { type: 'image/png' }))
      .catch(() => null),
  };
}

export async function sendInvoiceImage(viewRef, order, t) {
  const message = orderMessage(order, t);
  if (ready?.id !== order.id) prepareInvoiceImage(viewRef, order);
  const file = await ready.file;
  if (file && navigator.canShare?.({ files: [file] })) {
    // Some apps drop the text of a shared picture — keep it on the clipboard too.
    Clipboard.setStringAsync(message).catch(() => {});
    try {
      await navigator.share({ files: [file], text: message });
      return 'app';
    } catch (e) {
      if (e?.name === 'AbortError') return 'menu';
    }
  }
  // No file sharing: the WhatsApp chat with the message and tracking link.
  window.location.href = `https://wa.me/${waNumber(order.phone)}?text=${encodeURIComponent(message)}`;
  return 'chat';
}
