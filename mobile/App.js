import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, ActivityIndicator, AppState, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import AppShell from './src/navigation/AppShell';
import { STRINGS, deviceLang } from './src/i18n';
import { THEMES, DEEP } from './src/theme';
import { isAppLockEnabled, requireBiometricUnlock } from './src/lib/appLock';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const { user, booting } = useAuth();
  const [locked, setLocked] = useState(false);
  const appState = useRef(AppState.currentState);
  const lang = deviceLang();
  const t = STRINGS[lang];
  const th = THEMES.light;

  const checkLock = useCallback(async () => {
    if (!user) return;
    if (await isAppLockEnabled()) {
      setLocked(true);
      const ok = await requireBiometricUnlock(t);
      setLocked(!ok);
    }
  }, [user]);

  useEffect(() => { checkLock(); }, [checkLock]);

  // Re-lock whenever the app returns from the background — the standard
  // pattern used by banking apps, so a picked-up phone doesn't leak orders.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') checkLock();
      appState.current = next;
    });
    return () => sub.remove();
  }, [checkLock]);

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: th.bg }}>
        <ActivityIndicator size="large" color={DEEP} />
      </View>
    );
  }

  if (!user) return <AuthScreen t={t} th={th} theme="light" />;

  if (locked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: th.bg }}>
        <Text onPress={checkLock} style={{ color: DEEP, fontWeight: '700' }}>🔒 {t.welcome}</Text>
      </View>
    );
  }

  return <AppShell />;
}
