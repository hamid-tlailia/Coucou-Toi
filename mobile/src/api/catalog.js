import { api } from './client';

let cached = null;

/** Store products (live from the website via the server), cached per app session. */
export async function getCatalog() {
  if (cached) return cached;
  const { products } = await api('/catalog');
  cached = products || [];
  return cached;
}
