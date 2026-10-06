import { api } from './client';

// Orders already seen in lists, so a scan can show the order instantly.
const known = new Map();
const remember = (orders) => { for (const o of orders || []) known.set(o.id, o); return orders; };

/** Instant, offline match of a scanned/typed code against loaded orders. */
export function findCached(code) {
  const term = String(code || '').trim().replace(/^#/, '');
  if (!term) return null;
  const low = term.toLowerCase();
  for (const o of known.values()) {
    if (o.code === term || (term.length >= 4 && String(o.id).endsWith(low))) return o;
  }
  return null;
}

/** Server-side search: name, phone, city, short order number or tracking code. */
export const listOrders = ({ search, status, source } = {}) => {
  const qs = new URLSearchParams();
  if (search) qs.set('q', search);
  if (status && status !== 'all') qs.set('status', status);
  if (source && source !== 'all') qs.set('source', source);
  const q = qs.toString();
  return api(`/orders${q ? `?${q}` : ''}`).then((data) => { remember(data?.orders); return data; });
};

export const createOrder = (payload) =>
  api('/orders', { method: 'POST', body: payload, idempotencyKey: randomKey() });

export const updateOrder = (id, patch) => api(`/orders/${id}`, { method: 'PATCH', body: patch }).then((o) => { remember([o]); return o; });

export const deleteOrder = (id) => api(`/orders/${id}`, { method: 'DELETE' });

export const findByCode = (code) => api(`/orders/lookup/${encodeURIComponent(code)}`).then((o) => { remember([o]); return o; });

/** Uploaded invoice (base64 PDF/photo) → the order printed on it. */
export const findByFile = (data, mimeType) => api('/orders/lookup-file', { method: 'POST', body: { data, mimeType } });

export const getDashboard = (days = 14) => api(`/dashboard?days=${days}`);

/** Short, human-friendly order number: last 6 chars of the id. */
export const shortNo = (order) => `#${String(order.id).slice(-6).toUpperCase()}`;

function randomKey() {
  // Idempotency key so a flaky connection can't create the same order twice.
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
