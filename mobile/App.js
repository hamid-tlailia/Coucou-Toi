import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, AppState, Image, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold, Tajawal_800ExtraBold } from '@expo-google-fonts/tajawal';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { PrefsProvider, usePrefs } from './src/context/Prefs';
import AuthScreen from './src/screens/AuthScreen';
import AppShell from './src/navigation/AppShell';
import { Txt, Button } from './src/components/ui';
import { isAppLockEnabled, requireBiometricUnlock } from './src/lib/appLock';
import { GOLD } from './src/theme';

// Startup never waits on anything that could hang: the native splash is
// hidden on first render, and fonts get at most 3s (system font fallback).
const FONT_TIMEOUT_MS = 3000;

// Android: fonts are embedded in the APK by the expo-font config plugin
// (app.json), so nothing is loaded at runtime. iOS still loads them here.
const RUNTIME_FONTS = Platform.OS === 'android'
  ? {}
  : { Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold, Tajawal_800ExtraBold, ...Ionicons.font };

export default function App() {
  const [fontsLoaded, fontError] = useFonts(RUNTIME_FONTS);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    // Second attempt in case the first call raced the native view setup.
    const retry = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 1500);
    const t = setTimeout(() => setTimedOut(true), FONT_TIMEOUT_MS);
    return () => { clearTimeout(t); clearTimeout(retry); };
  }, []);

  if (fontError) console.warn('font loading failed, using system font', fontError);
  if (Platform.OS !== 'android' && !fontsLoaded && !fontError && !timedOut) return <Splash />;
  return (
    <SafeAreaProvider>
      <PrefsProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </PrefsProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const { user, booting, bootError, retryBoot } = useAuth();
  const { t } = usePrefs();
  const [locked, setLocked] = useState(false);
  const appState = useRef(AppState.currentState);

  const checkLock = useCallback(async () => {
    if (!user || !(await isAppLockEnabled())) return;
    setLocked(true);
    setLocked(!(await requireBiometricUnlock(t)));
  }, [user]);

  useEffect(() => { checkLock(); }, [checkLock]);

  // Re-lock when the app comes back from the background (banking-app style).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current === 'background' && next === 'active') checkLock();
      appState.current = next;
    });
    return () => sub.remove();
  }, [checkLock]);

  if (booting) return <Splash />;

  if (bootError) {
    return (
      <Center>
        <Ionicons name="cloud-offline-outline" size={54} color={GOLD} />
        <Txt w="b" size={17} style={{ marginTop: 14, textAlign: 'center' }}>{t.offline}</Txt>
        <Button title={t.retry} icon="refresh" onPress={retryBoot} style={{ marginTop: 20, minWidth: 180 }} />
      </Center>
    );
  }

  if (!user) return <AuthScreen />;

  if (locked) {
    return (
      <Center>
        <Image source={require('./assets/icon.png')} style={{ width: 96, height: 96, borderRadius: 30 }} />
        <Txt w="x" size={20} style={{ marginTop: 18 }}>{t.locked}</Txt>
        <Button title={t.unlock} icon="finger-print" onPress={checkLock} style={{ marginTop: 20, minWidth: 180 }} />
      </Center>
    );
  }

  return <AppShell />;
}

function Center({ children }) {
  const { th } = usePrefs();
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: th.bg }}>{children}</View>;
}

function Splash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#120C14' }}>
      <Image source={require('./assets/splash-icon.png')} style={{ width: 220, height: 220 }} resizeMode="contain" />
      <ActivityIndicator color={GOLD} style={{ marginTop: 12 }} />
    </View>
  );
}
