import { api } from './client';

export const updateMe = (patch) => api('/me', { method: 'PATCH', body: patch });

export const listNotifications = () => api('/notifications');
export const markAllRead = () => api('/notifications/read-all', { method: 'POST' });
export const savePushToken = (token) => api('/notifications/push-token', { method: 'PUT', body: { token } });

export const sendTestNotification = () => api('/notifications/test', { method: 'POST' });

export const logVisit = () => api('/visits', { method: 'POST' });
