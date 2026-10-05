import { API_URL } from '../config';
import { getAccess, getRefresh, saveTokens, clearTokens } from '../auth/storage';

let refreshing = null;          // de-dupes concurrent refreshes
let onUnauthorized = () => {};  // set by AuthContext

export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function refreshTokens() {
  const refreshToken = await getRefresh();
  if (!refreshToken) throw new Error('no-refresh');
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error('refresh-failed');
  const data = await res.json();
  await saveTokens(data); // server rotates the refresh token on every use
  return data.accessToken;
}

export async function api(path, { method = 'GET', body, auth = true, idempotencyKey } = {}) {
  const send = async (token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    // Abort eventually so a dead connection shows an error instead of spinning
    // forever — generous because a free-tier server can take ~30s to wake up.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 40000);
    try {
      return await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
    } catch {
      throw new ApiError('network', 0);
    } finally {
      clearTimeout(timer);
    }
  };

  let token = auth ? await getAccess() : null;
  let res = await send(token);

  if (res.status === 401 && auth) {
    try {
      if (!refreshing) refreshing = refreshTokens().finally(() => { refreshing = null; });
      token = await refreshing;
      res = await send(token);
    } catch {
      await clearTokens();
      onUnauthorized();
      throw new ApiError('unauthorized', 401);
    }
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON error page from a proxy */ }
  if (!res.ok) throw new ApiError(data?.error || 'request_failed', res.status, data);
  return data;
}

export class ApiError extends Error {
  constructor(code, status, data) {
    super(code);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}
