import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { GhostButton } from '../components/ui';
import { DEEP, PLUM, GOLD, RED } from '../theme';
import { planOf as planOfCfg } from '../config';

export default function ProfileScreen({ t, th, theme, lang, setLang, setTheme, onUpgrade }) {
  const { user, signOut } = useAuth();
  const plan = planOfCfg(user.plan);
  const used = user.used ?? 0;
  const pct = Math.min(100, (used / plan.quota) * 100);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
      <View style={{ backgroundColor: th.surface, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 14 }}>
        <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: DEEP, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Text style={{ color: '#F3D9A8', fontSize: 25, fontWeight: '700' }}>{(user.name || 'U')[0].toUpperCase()}</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: th.text }}>{user.name}</Text>
        <Text style={{ fontSize: 12.5, color: th.muted, marginTop: 3 }}>{user.email}</Text>
      </View>

      <View style={{ backgroundColor: plan.id === 'free' ? th.surface : DEEP, borderRadius: 20, padding: 18, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 11, color: plan.id === 'free' ? th.muted : 'rgba(255,255,255,.75)' }}>{t.currentPlan}</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: plan.id === 'free' ? th.text : '#FFF', marginTop: 2 }}>{t[`p_${plan.id}`]}</Text>
          </View>
        </View>
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 11.5, color: plan.id === 'free' ? th.muted : 'rgba(255,255,255,.85)' }}>{used} {t.ordersUsed} {plan.quota}</Text>
            <Text style={{ fontSize: 11.5, color: plan.id === 'free' ? th.muted : 'rgba(255,255,255,.85)' }}>{Math.round(pct)}%</Text>
          </View>
          <View style={{ height: 7, borderRadius: 6, backgroundColor: plan.id === 'free' ? th.raised : 'rgba(255,255,255,.22)', overflow: 'hidden' }}>
            <View style={{ width: `${pct}%`, height: '100%', backgroundColor: plan.id === 'free' ? PLUM : '#FFF', borderRadius: 6 }} />
          </View>
        </View>
        <TouchableOpacity onPress={onUpgrade} style={{ marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: plan.id === 'free' ? DEEP : '#FFF', alignItems: 'center' }}>
          <Text style={{ fontWeight: '700', fontSize: 13, color: plan.id === 'free' ? '#FFF' : DEEP }}>
            {plan.id === 'free' ? `⚡ ${t.upgrade}` : t.manage}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: th.surface, borderRadius: 18, padding: 16, marginBottom: 14 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '700', color: th.text, marginBottom: 12 }}>{t.settings}</Text>
        <Text style={{ fontSize: 11.5, color: th.muted, marginBottom: 7 }}>{t.language}</Text>
        <View style={{ flexDirection: 'row', gap: 7, marginBottom: 14 }}>
          {[['ar', 'العربية'], ['fr', 'Français'], ['en', 'English']].map(([k, l]) => (
            <TouchableOpacity key={k} onPress={() => setLang(k)} style={{ flex: 1, padding: 10, borderRadius: 11, backgroundColor: lang === k ? DEEP : th.raised, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: lang === k ? '700' : '500', color: lang === k ? '#FFF' : th.text }}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ fontSize: 11.5, color: th.muted, marginBottom: 7 }}>{t.theme}</Text>
        <View style={{ flexDirection: 'row', gap: 7 }}>
          {[['light', `☀️ ${t.light}`], ['dark', `🌙 ${t.dark}`]].map(([k, l]) => (
            <TouchableOpacity key={k} onPress={() => setTheme(k)} style={{ flex: 1, padding: 10, borderRadius: 11, backgroundColor: theme === k ? GOLD : th.raised, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: theme === k ? '700' : '500', color: theme === k ? '#FFF' : th.text }}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <GhostButton th={th} title={t.logout} onPress={signOut} color={RED} />
    </ScrollView>
  );
}
