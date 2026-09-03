import { api } from './client';

/** AI-drafted orders awaiting review. status defaults to 'pending' server-side. */
export const listPendingOrders = (status = 'pending') =>
  api(`/pending-orders?status=${encodeURIComponent(status)}`);

/**
 * overrides lets the admin correct any field the AI got wrong before the
 * draft becomes a real order — only send what changed, the server fills in
 * the rest from the AI draft.
 */
export const approvePendingOrder = (id, overrides = {}) =>
  api(`/pending-orders/${id}/approve`, { method: 'POST', body: overrides });

export const rejectPendingOrder = (id) =>
  api(`/pending-orders/${id}/reject`, { method: 'POST' });
