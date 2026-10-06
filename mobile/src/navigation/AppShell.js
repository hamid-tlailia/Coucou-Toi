import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StatusBar, AppState, BackHandler, Image, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { usePrefs } from '../context/Prefs';
import { Txt, Press, IconBtn, haptic } from '../components/ui';
import { GOLD_GRAD, RED, CLEAR, shadow } from '../theme';
import { listNotifications, markAllRead, logVisit } from '../api/account';
import { listOrders } from '../api/orders';
import { registerForNotifications, showLocalNotification, onNotificationTap, onNotificationReceived, setBadge } from '../lib/push';

import DashboardScreen from '../screens/DashboardScreen';
import OrdersScreen from '../screens/OrdersScreen';
import SmartOrdersScreen from '../screens/SmartOrdersScreen';
import ScanScreen from '../screens/ScanScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddOrderSheet from '../screens/AddOrderSheet';
import OrderSheet from '../screens/OrderSheet';
import InvoiceSheet from '../screens/InvoiceSheet';
import NotificationsSheet from '../screens/NotificationsSheet';

const TABS = [
  { key: 'home', icon: 'grid' },
  { key: 'orders', icon: 'bag-handle' },
  { key: 'smart', icon: 'sparkles' },
  { key: 'scan', icon: 'scan' },
  { key: 'profile', icon: 'settings' },
];
const POLL_MS = 20000;
const VISIT_GAP_MS = 30 * 60 * 1000;

export default function AppShell() {
  const { user } = useAuth();
  const { t, th, mode } = usePrefs();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState('home');
  const [visited, setVisited] = useState({ home: true });
  const [refreshKey, setRefreshKey] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState({ unread: 0, items: [] });
  const [smartCount, setSmartCount] = useState(0);
  const [pushMode, setPushMode] = useState(null);

  const pushModeRef = useRef(null);
  const lastSeen = useRef(null);
  const lastVisit = useRef(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const tabRef = useRef('home');
  const go = useCallback((key) => {
    if (key === tabRef.current) return;
    tabRef.current = key;
    haptic('light');
    setVisited((v) => ({ ...v, [key]: true }));
    setTab(key);
  }, []);

  /* ---------- notifications ---------- */
  const poll = useCallback(async () => {
    try {
      const data = await listNotifications();
      const items = data.notifications || [];
      setNotifs({ unread: data.unread, items });
      setBadge(data.unread);
      if (lastSeen.current !== null) {
        const fresh = [];
        for (const n of items) { if (n.id === lastSeen.current) break; if (!n.read) fresh.push(n); }
        if (fresh.length) {
          refresh();
          // No remote push in this build → surface it ourselves.
          if (pushModeRef.current !== 'push') {
            fresh.slice(0, 3).forEach((n) => showLocalNotification({ title: n.title, body: n.body, data: { type: n.type, orderId: n.orderId } }));
          }
        }
      }
      lastSeen.current = items[0]?.id ?? '';
    } catch { /* offline — next tick will retry */ }
  }, [refresh]);

  const openFromNotification = useCallback(async (n) => {
    setNotifOpen(false);
    if (n.type === 'new_draft') return go('smart');
    if (n.orderId) {
      try {
        const { orders } = await listOrders({ search: n.orderId });
        if (orders?.[0]) setTimeout(() => setDetail(orders[0]), 300);
      } catch { /* ignore */ }
    }
  }, [go]);

  const enablePush = useCallback(async () => {
    const m = await registerForNotifications().catch(() => 'denied');
    pushModeRef.current = m;
    setPushMode(m);
  }, []);

  const visit = useCallback(() => {
    if (Date.now() - lastVisit.current < VISIT_GAP_MS) return;
    lastVisit.current = Date.now();
    logVisit().catch(() => {});
  }, []);

  useEffect(() => {
    enablePush();
    visit();
    poll();
    let timer = setInterval(poll, POLL_MS);
    const appSub = AppState.addEventListener('change', (s) => {
      clearInterval(timer);
      if (s === 'active') { poll(); visit(); refresh(); timer = setInterval(poll, POLL_MS); }
    });
    const tapSub = onNotificationTap((data) => openFromNotification(data));
    const recvSub = onNotificationReceived(() => poll());
    return () => { clearInterval(timer); appSub.remove(); tapSub.remove(); recvSub.remove(); };
  }, []);

  /* ---------- Android back button: return to Home first ---------- */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tab !== 'home') { go('home'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [tab, go]);

  /* ---------- sheet choreography (one modal at a time) ---------- */
  const swap = (closeFn, openFn) => { closeFn(); setTimeout(openFn, 280); };
  const onSaved = (order, isNew) => {
    setAddOpen(false);
    setEditing(null);
    refresh();
    setTimeout(() => (isNew ? setInvoice(order) : setDetail(order)), 300);
  };
  const closeNotifs = () => {
    setNotifOpen(false);
    if (notifs.unread) markAllRead().then(poll).catch(() => {});
  };

  const titles = { home: user.store || t.dashboard, orders: t.tabOrders, smart: t.tabSmart, scan: t.tabScan, profile: t.tabProfile };
  const hour = new Date().getHours();
  const showFab = tab === 'home' || tab === 'orders';

  const screen = (key) => {
    switch (key) {
      case 'home': return <DashboardScreen refreshKey={refreshKey} goTo={go} />;
      case 'orders': return <OrdersScreen refreshKey={refreshKey} onOpenOrder={setDetail} />;
      case 'smart': return <SmartOrdersScreen refreshKey={refreshKey} onCountChange={setSmartCount} onApproved={(o) => { refresh(); setTimeout(() => setInvoice(o), 200); }} />;
      case 'scan': return <ScanScreen onOpenOrder={setDetail} onChanged={refresh} />;
      case 'profile': return <ProfileScreen pushMode={pushMode} onEnablePush={enablePush} />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }} edges={['top']}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={th.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../../assets/icon.png')} style={{ width: 44, height: 44, borderRadius: 15 }} />
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Txt size={12.5} color={th.muted}>{tab === 'home' ? `${hour < 12 ? t.goodMorning : t.goodEvening}، ${user.name?.split(' ')[0] || ''}` : user.store}</Txt>
          <Txt w="x" size={20} numberOfLines={1}>{titles[tab]}</Txt>
        </View>
        <IconBtn icon="notifications-outline" badge={notifs.unread} onPress={() => { poll(); setNotifOpen(true); }} />
      </View>

      {/* Screens stay mounted after first visit → instant tab switches. Camera only runs on its tab. */}
      <View style={{ flex: 1 }}>
        {TABS.map(({ key }) => {
          if (!visited[key]) return null;
          if (key === 'scan' && tab !== 'scan') return null;
          const active = key === tab;
          return (
            <View key={key} style={[StyleSheet.absoluteFill, !active && { display: 'none' }]}>
              {screen(key)}
            </View>
          );
        })}
      </View>

      {showFab && (
        <Press onPress={() => { setEditing(null); setAddOpen(true); }} hapticKind="medium" scale={0.9}
          style={[styles.fab, { bottom: insets.bottom + 92 }, shadow(10, '#A87D3E')]}>
          <LinearGradient colors={GOLD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabInner}>
            <Ionicons name="add" size={32} color="#1A1214" />
          </LinearGradient>
        </Press>
      )}

      {/* Floating tab bar */}
      <View style={[styles.tabBar, { bottom: insets.bottom + 12, backgroundColor: mode === 'dark' ? '#1E1523' : '#FFFFFF', borderColor: th.border }, shadow(12)]}>
        {TABS.map((tb) => {
          const on = tab === tb.key;
          const badge = tb.key === 'smart' ? smartCount : 0;
          return (
            <Press key={tb.key} onPress={() => go(tb.key)} scale={0.88} hapticKind={null} style={styles.tabItem}>
              <View style={[styles.tabIcon, { backgroundColor: on ? `${th.accent}22` : CLEAR }]}>
                <Ionicons name={on ? tb.icon : `${tb.icon}-outline`} size={22} color={on ? th.accent : th.muted} />
                {!!badge && (
                  <View style={styles.tabBadge}><Txt w="b" size={9.5} color="#FFF">{badge > 9 ? '9+' : badge}</Txt></View>
                )}
              </View>
              <Txt w={on ? 'b' : 'm'} size={11} color={on ? th.accent : th.muted} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {t[`tab${tb.key[0].toUpperCase()}${tb.key.slice(1)}`]}
              </Txt>
            </Press>
          );
        })}
      </View>

      <AddOrderSheet visible={addOpen} editing={editing} onClose={() => { setAddOpen(false); setEditing(null); }} onSaved={onSaved} />
      <OrderSheet
        order={detail}
        onClose={() => setDetail(null)}
        onChanged={refresh}
        onInvoice={(o) => swap(() => setDetail(null), () => setInvoice(o))}
        onEdit={(o) => swap(() => setDetail(null), () => { setEditing(o); setAddOpen(true); })}
      />
      <InvoiceSheet order={invoice} onClose={() => setInvoice(null)} />
      <NotificationsSheet visible={notifOpen} items={notifs.items} onClose={closeNotifs}
        onMarkAll={() => markAllRead().then(poll).catch(() => {})} onTap={openFromNotification} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6 },
  fab: { position: 'absolute', alignSelf: 'center', borderRadius: 24 },
  fabInner: { width: 62, height: 62, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  tabBar: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', borderRadius: 30, paddingTop: 9, paddingBottom: 8, paddingHorizontal: 6, borderWidth: 1 },
  tabItem: { flex: 1, alignItems: 'center', gap: 4, marginHorizontal: 2 },
  tabIcon: { width: 52, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabBadge: { position: 'absolute', top: -3, right: 2, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
});
