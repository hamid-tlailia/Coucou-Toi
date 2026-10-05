import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { STRINGS, deviceLang } from '../i18n';
import { THEMES, GREEN, RED, GOLD, FONT } from '../theme';

const Ctx = createContext(null);
export const usePrefs = () => useContext(Ctx);

const LANG_KEY = 'ccl.lang';
const MODE_KEY = 'ccl.mode';

/**
 * Language + theme, persisted on the device, plus the app-wide toast.
 * Every screen reads `t` (strings) and `th` (colors) from here.
 */
export function PrefsProvider({ children }) {
  const [lang, setLangState] = useState(deviceLang());
  const [mode, setModeState] = useState('dark');
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      const [l, m] = await Promise.all([
        SecureStore.getItemAsync(LANG_KEY).catch(() => null),
        SecureStore.getItemAsync(MODE_KEY).catch(() => null),
      ]);
      if (l && STRINGS[l]) setLangState(l);
      if (m && THEMES[m]) setModeState(m);
      setReady(true);
    })();
  }, []);

  const setLang = useCallback((l) => { setLangState(l); SecureStore.setItemAsync(LANG_KEY, l).catch(() => {}); }, []);
  const setMode = useCallback((m) => { setModeState(m); SecureStore.setItemAsync(MODE_KEY, m).catch(() => {}); }, []);
  const showToast = useCallback((msg, kind = 'ok') => setToast({ msg, kind, id: Date.now() }), []);

  const value = useMemo(() => ({
    lang, setLang, mode, setMode, showToast,
    t: { ...STRINGS.ar, ...STRINGS[lang] }, // missing keys fall back to Arabic
    th: THEMES[mode],
  }), [lang, mode, setLang, setMode, showToast]);

  if (!ready) return null;
  return (
    <Ctx.Provider value={value}>
      {children}
      <Toast toast={toast} th={value.th} />
    </Ctx.Provider>
  );
}

function Toast({ toast, th }) {
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(-120)).current;
  const [shown, setShown] = useState(null);

  useEffect(() => {
    if (!toast) return;
    setShown(toast);
    y.setValue(-120);
    Animated.sequence([
      Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 180 }),
      Animated.delay(2100),
      Animated.timing(y, { toValue: -120, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [toast]);

  if (!shown) return null;
  const color = shown.kind === 'error' ? RED : shown.kind === 'info' ? GOLD : GREEN;
  const icon = shown.kind === 'error' ? 'alert-circle' : shown.kind === 'info' ? 'notifications' : 'checkmark-circle';
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { top: insets.top + 8, backgroundColor: th.mode === 'dark' ? '#2A1E30' : '#1C1418', transform: [{ translateY: y }] }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Animated.Text style={styles.toastText} numberOfLines={2}>{shown.msg}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, paddingHorizontal: 16, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(212,175,106,0.25)',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  toastText: { flex: 1, color: '#F6F0E8', fontFamily: FONT.m, fontSize: 14 },
});
