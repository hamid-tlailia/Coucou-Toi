import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { STRINGS, deviceLang } from '../i18n';
import { THEMES, DEEP, GOLD, PLUM, RED } from '../theme';
import { planOf } from '../config';

import OrdersScreen from '../screens/OrdersScreen';
import ScanScreen from '../screens/ScanScreen';
import SmartOrdersScreen from '../screens/SmartOrdersScreen';
import StatsScreen from '../screens/StatsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddOrderSheet from '../screens/AddOrderSheet';
import ReceiptSheet from '../screens/ReceiptSheet';
import PlansSheet from '../screens/PlansSheet';
import CheckoutIAP from '../screens/CheckoutIAP';
import BottomSheet from '../components/BottomSheet';

const TABS = [
  { key: 'orders', icon: '📦' },
  { key: 'smart', icon: '🤖' },
  { key: 'scan', icon: '📷' },
  { key: 'stats', icon: '📊' },
  { key: 'profile', icon: '👤' },
];

export default function AppShell() {
  const { user, refreshUser } = useAuth();
  const [lang, setLang] = useState(user?.lang || deviceLang());
  const [theme, setTheme] = useState(user?.theme || 'light');
  const [tab, setTab] = useState('orders');
  const [addOpen, setAddOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [plansOpen, setPlansOpen] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [limitOpen, setLimitOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [smartCount, setSmartCount] = useState(0);

  const t = STRINGS[lang];
  const th = THEMES[theme];
  const plan = planOf(user.plan);
  const quotaLeft = Math.max(0, plan.quota - (user.used ?? 0));

  const showToast = useCallback((m) => { setToast(m); setTimeout(() => setToast(''), 2200); }, []);

  const onOrderCreated = () => { refreshUser(); setRefreshKey((k) => k + 1); };
  const onWhatsApp = (order) => {
    const msg = `${order.customer}\n${t.orderNo}: #${order.id}\n${order.items}`;
    Linking.openURL(`https://wa.me/${order.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }} edges={['top', 'bottom']}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />

      <Header th={th} user={user} plan={plan} t={t} onPressPlan={() => setPlansOpen(true)} />

      <View style={{ flex: 1 }}>
        {tab === 'orders' && (
          <OrdersScreen t={t} th={th} theme={theme} refreshKey={refreshKey}
            onOpenReceipt={setReceipt} onOpenWhatsApp={onWhatsApp} showToast={showToast} />
        )}
        {tab === 'smart' && (
          <SmartOrdersScreen t={t} th={th} theme={theme} refreshKey={refreshKey} showToast={showToast}
            onCountChange={setSmartCount} onApproved={(o) => { onOrderCreated(); setReceipt(o); }} />
        )}
        {tab === 'scan' && <ScanScreen t={t} th={th} theme={theme} showToast={showToast} />}
        {tab === 'stats' && <StatsScreen t={t} th={th} refreshKey={refreshKey} />}
        {tab === 'profile' && (
          <ProfileScreen t={t} th={th} theme={theme} lang={lang} setLang={setLang} setTheme={setTheme}
            onUpgrade={() => setPlansOpen(true)} />
        )}
      </View>

      {tab === 'orders' && (
        <TouchableOpacity
          onPress={() => (quotaLeft > 0 ? setAddOpen(true) : setLimitOpen(true))}
          style={{
            position: 'absolute', bottom: 78, alignSelf: 'center', width: 56, height: 56, borderRadius: 19,
            backgroundColor: quotaLeft > 0 ? DEEP : th.raised, alignItems: 'center', justifyContent: 'center',
            shadowColor: DEEP, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8,
          }}
        >
          <Text style={{ color: quotaLeft > 0 ? '#FFF' : th.muted, fontSize: 26, fontWeight: '700' }}>{quotaLeft > 0 ? '+' : '🔒'}</Text>
        </TouchableOpacity>
      )}

      <TabBar tabs={TABS} tab={tab} setTab={setTab} th={th} theme={theme} t={t} badges={{ smart: smartCount }} />

      <AddOrderSheet visible={addOpen} onClose={() => setAddOpen(false)} t={t} th={th}
        quotaLeft={quotaLeft} quota={plan.quota}
        onCreated={(o) => { onOrderCreated(); setReceipt(o); }}
        onLimit={() => setLimitOpen(true)} />

      <ReceiptSheet order={receipt} onClose={() => setReceipt(null)} t={t} th={th} storeName={user.store} />

      <PlansSheet visible={plansOpen} onClose={() => setPlansOpen(false)} t={t} th={th} currentPlanId={user.plan}
        onPick={(p, cycle) => { setPlansOpen(false); setCheckout({ plan: p, cycle }); }} />

      <CheckoutIAP visible={!!checkout} plan={checkout?.plan} cycle={checkout?.cycle} t={t} th={th} showToast={showToast}
        onClose={() => setCheckout(null)}
        onActivated={() => { setCheckout(null); refreshUser(); showToast(t.paySuccess); }} />

      <BottomSheet visible={limitOpen} onClose={() => setLimitOpen(false)} th={th}>
        <View style={{ alignItems: 'center', paddingVertical: 6 }}>
          <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#FBEAE8', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 25 }}>🔒</Text>
          </View>
          <Text style={{ fontSize: 19, fontWeight: '700', color: th.text }}>{t.limitTitle}</Text>
          <Text style={{ fontSize: 13, color: th.muted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>{t.limitBody}</Text>
          <TouchableOpacity onPress={() => { setLimitOpen(false); setPlansOpen(true); }} style={{ backgroundColor: DEEP, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 40, marginTop: 18 }}>
            <Text style={{ color: '#FFF', fontWeight: '700' }}>⚡ {t.seePlans}</Text>
          </TouchableOpacity>
          <Text onPress={() => setLimitOpen(false)} style={{ color: th.muted, marginTop: 10, fontSize: 12.5 }}>{t.later}</Text>
        </View>
      </BottomSheet>

      {!!toast && (
        <View style={{ position: 'absolute', bottom: 92, left: 24, right: 24, backgroundColor: th.text, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16 }}>
          <Text style={{ color: th.bg, textAlign: 'center', fontWeight: '600', fontSize: 12.5 }}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function Header({ th, user, plan, t, onPressPlan }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: th.border }}>
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: DEEP, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#F3D9A8', fontWeight: '700' }}>{(user.store || 'CL').slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: th.text }}>{t.appName}</Text>
        <Text numberOfLines={1} style={{ fontSize: 11.5, color: th.muted }}>{user.store}</Text>
      </View>
      <TouchableOpacity onPress={onPressPlan} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: plan.id === 'free' ? th.raised : DEEP }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: plan.id === 'free' ? th.muted : '#FFF' }}>{t[`p_${plan.id}`]}</Text>
      </TouchableOpacity>
    </View>
  );
}

function TabBar({ tabs, tab, setTab, th, theme, t, badges = {} }) {
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: th.border, paddingTop: 8, backgroundColor: th.surface }}>
      {tabs.map((tb) => {
        const on = tab === tb.key;
        const badge = badges[tb.key];
        return (
          <TouchableOpacity key={tb.key} onPress={() => setTab(tb.key)} style={{ flex: 1, alignItems: 'center', paddingBottom: 6 }}>
            <View>
              <Text style={{ fontSize: 19, opacity: on ? 1 : 0.5 }}>{tb.icon}</Text>
              {!!badge && (
                <View style={{ position: 'absolute', top: -3, insetInlineEnd: -9, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                  <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '700' }}>{badge > 9 ? '9+' : badge}</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 10.5, fontWeight: on ? '700' : '500', color: on ? (theme === 'light' ? DEEP : '#E3C08A') : th.muted, marginTop: 2 }}>
              {t[`tab${tb.key[0].toUpperCase()}${tb.key.slice(1)}`]}
            </Text>
            <View style={{ width: on ? 18 : 0, height: 3, borderRadius: 3, backgroundColor: GOLD, marginTop: 3 }} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
