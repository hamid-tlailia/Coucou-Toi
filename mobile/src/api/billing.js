import { api } from './client';

/**
 * The device never decides "I paid" — it hands Apple/Google's signed
 * receipt to the server, which verifies it directly with Apple/Google
 * servers before unlocking the plan. See server/src/routes/billing.js.
 */
export const verifyIosReceipt = (transactionId, productId) =>
  api('/billing/apple/verify', { method: 'POST', body: { transactionId, productId } });

export const verifyAndroidPurchase = (purchaseToken, productId) =>
  api('/billing/google/verify', { method: 'POST', body: { purchaseToken, productId } });

export const restorePurchases = () => api('/billing/restore', { method: 'POST' });
