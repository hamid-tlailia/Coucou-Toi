export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.cocolove.app';
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// Apple IAP product ids — must match App Store Connect exactly.
export const IAP_SKUS = {
  starter: 'com.cocolove.orders.starter.monthly',
  growth: 'com.cocolove.orders.growth.monthly',
  business: 'com.cocolove.orders.business.monthly',
  starter_year: 'com.cocolove.orders.starter.yearly',
  growth_year: 'com.cocolove.orders.growth.yearly',
  business_year: 'com.cocolove.orders.business.yearly',
};

// Prices in Tunisian dinar (TND) — MUST mirror server/src/lib/plans.js
// exactly. This copy only drives what the UI displays; the server copy is
// what's actually enforced when a receipt is verified.
export const PLANS = [
  { id: 'free', quota: 10, price: 0, priceY: 0, accent: '#8A7A8C' },
  { id: 'starter', quota: 150, price: 29, priceY: 290, accent: '#7A3F63' },
  { id: 'growth', quota: 750, price: 75, priceY: 750, accent: '#B68A4E', popular: true },
  { id: 'business', quota: 2500, price: 150, priceY: 1500, accent: '#3F8F63' },
];
export const planOf = (id) => PLANS.find((p) => p.id === id) || PLANS[0];
