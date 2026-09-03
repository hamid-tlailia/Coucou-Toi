import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import { api, setUnauthorizedHandler } from '../api/client';
import { saveTokens, clearTokens, getAccess } from './storage';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '../config';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const [, googleResponse, googlePrompt] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    clientId: GOOGLE_WEB_CLIENT_ID,
  });

  const loadMe = useCallback(async () => {
    try {
      const me = await api('/me');
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    (async () => {
      if (await getAccess()) await loadMe();
      setBooting(false);
    })();
  }, [loadMe]);

  // Google returns an id_token; the SERVER verifies it against Google's JWKS.
  // We never trust identity claims produced on the device.
  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    (async () => {
      const idToken = googleResponse.params?.id_token;
      if (!idToken) return;
      const data = await api('/auth/google', { method: 'POST', auth: false, body: { idToken } });
      await saveTokens(data);
      setUser(data.user);
    })().catch(() => {});
  }, [googleResponse]);

  const signInWithGoogle = () => googlePrompt();

  // Apple Sign In is mandatory on iOS once any third-party login is offered
  // (App Store Review Guideline 4.8).
  const signInWithApple = async () => {
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    const data = await api('/auth/apple', {
      method: 'POST',
      auth: false,
      body: {
        identityToken: cred.identityToken,
        rawNonce,
        // Apple sends the name only on the very first authorization.
        fullName: cred.fullName
          ? [cred.fullName.givenName, cred.fullName.familyName].filter(Boolean).join(' ')
          : null,
      },
    });
    await saveTokens(data);
    setUser(data.user);
  };

  const signInWithEmail = async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', auth: false, body: { email, password } });
    await saveTokens(data);
    setUser(data.user);
  };

  const signUpWithEmail = async (payload) => {
    const data = await api('/auth/register', { method: 'POST', auth: false, body: payload });
    await saveTokens(data);
    setUser(data.user);
  };

  const signOut = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    await clearTokens();
    setUser(null);
  };

  return (
    <Ctx.Provider
      value={{
        user, booting, setUser, refreshUser: loadMe,
        signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
