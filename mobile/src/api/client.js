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
    return fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
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
  const data = text ? JSON.parse(text) : null;
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
