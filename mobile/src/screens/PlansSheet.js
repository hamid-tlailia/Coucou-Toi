import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import BottomSheet from '../components/BottomSheet';
import { PLANS } from '../config';
import { DEEP, GOLD, GREEN } from '../theme';
import { formatTND } from '../lib/money';

const FEATS = {
  free: ['feat_all', 'feat_pdf', 'feat_scan'],
  starter: ['feat_all', 'feat_pdf', 'feat_scan', 'feat_stats'],
  growth: ['feat_all', 'feat_pdf', 'feat_scan', 'feat_stats', 'feat_multi', 'feat_brand'],
  business: ['feat_all', 'feat_pdf', 'feat_scan', 'feat_stats', 'feat_multi', 'feat_brand', 'feat_api', 'feat_support'],
};

export default function PlansSheet({ visible, onClose, t, th, currentPlanId, onPick }) {
  const [cycle, setCycle] = useState('monthly');

  return (
    <BottomSheet visible={visible} onClose={onClose} th={th}>
      <Text style={{ fontSize: 19, fontWeight: '700', textAlign: 'center', color: th.text }}>{t.plans}</Text>

      <View style={{ flexDirection: 'row', backgroundColor: th.raised, borderRadius: 12, padding: 4, marginVertical: 14 }}>
        {[['monthly', t.monthly], ['yearly', t.yearly]].map(([k, l]) => (
          <TouchableOpacity key={k} onPress={() => setCycle(k)} style={{ flex: 1, paddingVertical: 9, borderRadius: 9, backgroundColor: cycle === k ? th.surface : 'transparent', alignItems: 'center' }}>
            <Text style={{ fontSize: 12.5, fontWeight: cycle === k ? '700' : '500', color: th.text }}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {PLANS.map((p) => {
        const cur = currentPlanId === p.id;
        const price = cycle === 'yearly' ? p.priceY : p.price;
        return (
          <View key={p.id} style={{ backgroundColor: th.surface, borderRadius: 18, padding: 16, marginBottom: 11, borderWidth: p.popular ? 2 : 1, borderColor: p.popular ? GOLD : th.border }}>
            {p.popular && (
              <View style={{ position: 'absolute', top: -9, insetInlineStart: 16, backgroundColor: GOLD, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: '#FFF', fontSize: 9.5, fontWeight: '700' }}>{t.popular}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 16.5, fontWeight: '700', color: th.text }}>{t[`p_${p.id}`]}</Text>
                <Text style={{ fontSize: 11.5, color: th.muted, marginTop: 2 }}>{p.quota} {t.ordersMo}</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: p.accent }}>
                {price === 0 ? t.p_free : formatTND(price, { withSymbol: true })}
              </Text>
            </View>
            <View style={{ marginTop: 11 }}>
              {FEATS[p.id].map((k) => (
                <View key={k} style={{ flexDirection: 'row', gap: 7, marginBottom: 5 }}>
                  <Text style={{ color: GREEN, fontWeight: '700' }}>✓</Text>
                  <Text style={{ fontSize: 12, color: th.muted }}>{t[k]}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              disabled={cur}
              onPress={() => onPick(p, cycle)}
              style={{ marginTop: 12, paddingVertical: 11, borderRadius: 11, alignItems: 'center', backgroundColor: cur ? th.raised : DEEP }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: cur ? th.muted : '#FFF' }}>
                {cur ? t.currentBadge : t.choosePlan}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
      <Text style={{ fontSize: 10.5, color: th.muted, textAlign: 'center', marginTop: 4 }}>{t.iapNote}</Text>
    </BottomSheet>
  );
}
