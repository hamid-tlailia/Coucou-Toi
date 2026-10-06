import { api } from './client';

/** Server-side search: name, phone, city, short order number or tracking code. */
export const listOrders = ({ search, status, source } = {}) => {
  const qs = new URLSearchParams();
  if (search) qs.set('q', search);
  if (status && status !== 'all') qs.set('status', status);
  if (source && source !== 'all') qs.set('source', source);
  const q = qs.toString();
  return api(`/orders${q ? `?${q}` : ''}`);
};

export const createOrder = (payload) =>
  api('/orders', { method: 'POST', body: payload, idempotencyKey: randomKey() });

export const updateOrder = (id, patch) => api(`/orders/${id}`, { method: 'PATCH', body: patch });

export const deleteOrder = (id) => api(`/orders/${id}`, { method: 'DELETE' });

export const findByCode = (code) => api(`/orders/lookup/${encodeURIComponent(code)}`);

/** Uploaded invoice (base64 PDF/photo) → the order printed on it. */
export const findByFile = (data, mimeType) => api('/orders/lookup-file', { method: 'POST', body: { data, mimeType } });

export const getDashboard = (days = 14) => api(`/dashboard?days=${days}`);

/** Short, human-friendly order number: last 6 chars of the id. */
export const shortNo = (order) => `#${String(order.id).slice(-6).toUpperCase()}`;

function randomKey() {
  // Idempotency key so a flaky connection can't create the same order twice.
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
