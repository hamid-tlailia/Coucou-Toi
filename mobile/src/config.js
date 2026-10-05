// The server address is baked into the APK at build time (see eas.json → env).
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/+$/, '');

/** Public tracking page for an order — the link customers receive on WhatsApp. */
export const trackingUrl = (code) => `${API_URL}/t/${encodeURIComponent(code)}`;
