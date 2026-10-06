/* eslint-env browser */
/** Base64 of a picked document, from the browser's File object. */
export function fileBase64(asset) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    if (asset.file) reader.readAsDataURL(asset.file);
    else fetch(asset.uri).then((r) => r.blob()).then((b) => reader.readAsDataURL(b)).catch(reject);
  });
}
