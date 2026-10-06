/**
 * Reads the order reference straight out of an invoice PDF's text — fast
 * (no AI call). Invoices carry a hidden `CT-REF:<tracking code>` marker;
 * older ones only have the printed short number (#XXXXXX).
 * Returns a lookup term, or null when the text gives nothing.
 */
async function codeFromPdf(base64) {
  try {
    const { getDocumentProxy, extractText } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(Buffer.from(base64, 'base64')));
    const { text } = await extractText(pdf, { mergePages: true });
    const ref = text.match(/CT-REF:([a-z0-9]{10,40}-\d{4})/);
    if (ref) return ref[1];
    const short = text.match(/#\s?([A-Z0-9]{6})/);
    return short ? short[1] : null;
  } catch (e) {
    console.error('codeFromPdf failed', e.message);
    return null;
  }
}

module.exports = { codeFromPdf };
