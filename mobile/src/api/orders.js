import { api } from './client';

/**
 * search: matches tracking code / barcode, customer name, or order number.
 * The match happens server-side (Postgres ILIKE + exact code lookup) so it
 * stays correct as the order list grows past what's cached on-device.
 */
export const listOrders = ({ search, status, source } = {}) => {
  const qs = new URLSearchParams();
  if (search) qs.set('q', search);
  if (status && status !== 'all') qs.set('status', status);
  if (source && source !== 'all') qs.set('source', source);
  const q = qs.toString();
  return api(`/orders${q ? `?${q}` : ''}`);
};

export const createOrder = (payload) =>
  api('/orders', { method: 'POST', body: payload, idempotencyKey: cryptoRandom() });

export const updateOrder = (id, patch) => api(`/orders/${id}`, { method: 'PATCH', body: patch });

export const findByCode = (code) => api(`/orders/lookup/${encodeURIComponent(code)}`);

export const orderStats = () => api('/orders/stats');

function cryptoRandom() {
  // Idempotency key so a flaky connection can't create the same order twice.
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
