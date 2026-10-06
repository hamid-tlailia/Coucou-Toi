import React, { useState, useEffect } from 'react';
import { View, ScrollView, Switch, Image } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { usePrefs } from '../context/Prefs';
import { Txt, Card, Input, Button, Press, haptic } from '../components/ui';
import { updateMe, sendTestNotification } from '../api/account';
import { isAppLockEnabled, setAppLockEnabled, requireBiometricUnlock } from '../lib/appLock';
import { GOLD, GREEN, RED, CLEAR } from '../theme';
import CaptureCard, { disableCapture } from '../components/CaptureCard';

export default function ProfileScreen({ pushMode, onEnablePush }) {
  const { user, setUser, signOut } = useAuth();
  const { t, th, lang, setLang, mode, setMode, showToast } = usePrefs();
  const [f, setF] = useState({ name: user.name || '', store: user.store || '', storePhone: user.storePhone || '', storeAddress: user.storeAddress || '' });
  const [saving, setSaving] = useState(false);
  const [lock, setLock] = useState(false);

  useEffect(() => { isAppLockEnabled().then(setLock); }, []);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const dirty = f.name !== (user.name || '') || f.store !== (user.store || '') || f.storePhone !== (user.storePhone || '') || f.storeAddress !== (user.storeAddress || '');

  const save = async () => {
    if (!f.name.trim() || !f.store.trim()) return showToast(t.required, 'error');
    setSaving(true);
    try {
      const me = await updateMe({ name: f.name.trim(), store: f.store.trim(), storePhone: f.storePhone.trim() || null, storeAddress: f.storeAddress.trim() || null });
      setUser(me);
      haptic('success');
      showToast(t.saved);
    } catch { showToast(t.error, 'error'); } finally { setSaving(false); }
  };

  const toggleLock = async (v) => {
    if (v && !(await requireBiometricUnlock(t))) return; // prove it works before enabling
    await setAppLockEnabled(v);
    setLock(v);
  };

  const pushLabel = pushMode === 'push' ? t.pushOn : pushMode === 'local' ? t.pushLocal : t.pushOff;
  const pushColor = pushMode === 'push' ? GREEN : pushMode === 'local' ? GOLD : RED;

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 140 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={{ alignItems: 'center', marginBottom: 18 }}>
        <Image source={require('../../assets/icon.png')} style={{ width: 78, height: 78, borderRadius: 26 }} />
        <Txt w="x" size={20} style={{ marginTop: 10 }}>{user.store || user.name}</Txt>
        <Txt size={13} color={th.muted}>{user.email}</Txt>
      </View>

      <Card>
        <Txt w="b" size={16}>{t.storeInfo}</Txt>
        <Txt size={12.5} color={th.muted} style={{ marginTop: 2 }}>{t.storeInfoHint}</Txt>
        <Input label={t.storeName} icon="storefront-outline" value={f.store} onChangeText={set('store')} />
        <Input label={t.storePhone} icon="call-outline" keyboardType="phone-pad" value={f.storePhone} onChangeText={set('storePhone')} placeholder="+216 22 123 456" />
        <Input label={t.storeAddress} icon="location-outline" value={f.storeAddress} onChangeText={set('storeAddress')} />
        <Input label={t.yourName} icon="person-outline" value={f.name} onChangeText={set('name')} />
        {dirty && <Button title={t.save} icon="checkmark" onPress={save} loading={saving} style={{ marginTop: 18 }} />}
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Txt w="b" size={16} style={{ marginBottom: 6 }}>{t.preferences}</Txt>
        <Txt w="b" size={12.5} color={th.muted} style={{ marginTop: 10, marginBottom: 8 }}>{t.language}</Txt>
        <Segmented value={lang} onChange={setLang} items={[['ar', 'العربية'], ['fr', 'Français'], ['en', 'English']]} />
        <Txt w="b" size={12.5} color={th.muted} style={{ marginTop: 14, marginBottom: 8 }}>{t.theme}</Txt>
        <Segmented value={mode} onChange={setMode} items={[['dark', `🌙  ${t.dark}`], ['light', `☀️  ${t.light}`]]} />
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Txt w="b" size={16} style={{ marginBottom: 4 }}>{t.security}</Txt>
        <Row icon="finger-print" label={t.appLock} right={<Switch value={lock} onValueChange={toggleLock} trackColor={{ true: GOLD, false: th.raised }} thumbColor="#FFF" />} />
        <Press onPress={pushMode !== 'push' ? onEnablePush : undefined}>
          <Row icon="notifications-outline" label={t.pushNotif}
            right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: pushColor }} />
              <Txt w="m" size={13} color={th.muted}>{pushLabel}</Txt>
            </View>} />
        </Press>
        <Press onPress={async () => {
          try { await sendTestNotification(); showToast(t.testSent, 'info'); } catch { showToast(t.error, 'error'); }
        }}>
          <Row icon="paper-plane-outline" label={t.testNotif} right={<Ionicons name="chevron-back" size={18} color={th.muted} />} />
        </Press>
        <Row icon="information-circle-outline" label={t.version} right={<Txt size={13} color={th.faint}>{Constants.expoConfig?.version}</Txt>} last />
      </Card>

      <CaptureCard />

      <Button title={t.logout} icon="log-out-outline" variant="danger" onPress={() => { disableCapture(); signOut(); }} style={{ marginTop: 18 }} />
    </ScrollView>
  );
}

function Segmented({ value, onChange, items }) {
  const { th } = usePrefs();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: th.raised, borderRadius: 14, padding: 4 }}>
      {items.map(([k, l]) => (
        <Press key={k} onPress={() => onChange(k)} style={{ flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', backgroundColor: value === k ? th.surface : CLEAR }}>
          <Txt w={value === k ? 'b' : 'm'} size={13} color={value === k ? th.accent : th.muted}>{l}</Txt>
        </Press>
      ))}
    </View>
  );
}

function Row({ icon, label, right, last }) {
  const { th } = usePrefs();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderColor: th.border }}>
      <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: th.raised, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={18} color={th.accent} />
      </View>
      <Txt w="m" size={14.5} style={{ flex: 1 }}>{label}</Txt>
      {right}
    </View>
  );
}
