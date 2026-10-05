import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setUnauthorizedHandler } from '../api/client';
import { savePushToken } from '../api/account';
import { saveTokens, clearTokens, getAccess } from './storage';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

/**
 * Email/password accounts only — this is a privately shared build, so the
 * Google/Apple sign-in flows (which need store-registered client ids) are
 * left out. The server still supports them if the app is ever published.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState(false);

  const loadMe = useCallback(async () => {
    try {
      setUser(await api('/me'));
    } catch (e) {
      // Offline at launch: keep the session, the screens will retry.
      if (e.code !== 'network') setUser(null);
      else throw e;
    }
  }, []);

  const boot = useCallback(async () => {
    setBooting(true);
    setBootError(false);
    if (await getAccess()) {
      try { await loadMe(); } catch { setBootError(true); } // server asleep/offline — offer a retry
    }
    setBooting(false);
  }, [loadMe]);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    boot();
  }, [boot]);

  const signIn = async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', auth: false, body: { email, password } });
    await saveTokens(data);
    setUser(await api('/me'));
  };

  const signUp = async (payload) => {
    const data = await api('/auth/register', { method: 'POST', auth: false, body: payload });
    await saveTokens(data);
    setUser(await api('/me'));
  };

  const signOut = async () => {
    await savePushToken(null).catch(() => {}); // stop pushes to this phone
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    await clearTokens();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, booting, bootError, retryBoot: boot, setUser, refreshUser: () => loadMe().catch(() => {}), signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  );
}
