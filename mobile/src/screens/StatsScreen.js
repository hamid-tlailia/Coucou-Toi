import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { StatCard } from '../components/ui';
import { SOURCES, STATUS_KEYS, PLUM, GOLD, GREEN, RED } from '../theme';
import { formatTND } from '../lib/money';
import { orderStats } from '../api/orders';

export default function StatsScreen({ t, th, refreshKey }) {
  const [s, setS] = useState(null);

  useEffect(() => { orderStats().then(setS).catch(() => {}); }, [refreshKey]);
  if (!s) return null;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <StatCard th={th} label={t.revenue} value={formatTND(s.revenue)} accent={GOLD} />
        <StatCard th={th} label={t.collected} value={formatTND(s.collected)} accent={GREEN} />
        <StatCard th={th} label={t.pending} value={formatTND(s.revenue - s.collected)} accent={RED} />
      </View>

      <Panel title={t.bySource} th={th}>
        {SOURCES.map((src) => {
          const d = s.bySource?.[src.key] || { count: 0, total: 0 };
          const pct = s.totalOrders ? (d.count / s.totalOrders) * 100 : 0;
          return (
            <Bar key={src.key} th={th} label={t[`src_${src.key}`]} value={`${d.count} · ${formatTND(d.total)}`} pct={pct} color={src.color} />
          );
        })}
      </Panel>

      <Panel title={t.byStatus} th={th}>
        {STATUS_KEYS.map((k) => {
          const c = s.byStatus?.[k] || 0;
          const pct = s.totalOrders ? (c / s.totalOrders) * 100 : 0;
          return <Bar key={k} th={th} label={t[`st_${k}`]} value={String(c)} pct={pct} color={PLUM} />;
        })}
      </Panel>

      <Panel title={t.avgOrder} th={th}>
        <Text style={{ fontSize: 26, fontWeight: '700', color: th.text, textAlign: 'center' }}>
          {formatTND(s.totalOrders ? s.revenue / s.totalOrders : 0)}
        </Text>
      </Panel>
    </ScrollView>
  );
}
function Panel({ title, children, th }) {
  return (
    <View style={{ backgroundColor: th.surface, borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <Text style={{ fontSize: 14.5, fontWeight: '700', color: th.text, marginBottom: 13 }}>{title}</Text>
      {children}
    </View>
  );
}
function Bar({ label, value, pct, color, th }) {
  return (
    <View style={{ marginBottom: 11 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontSize: 12.5, color: th.text }}>{label}</Text>
        <Text style={{ fontSize: 12.5, color: th.muted }}>{value}</Text>
      </View>
      <View style={{ height: 7, borderRadius: 6, backgroundColor: th.raised, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 6 }} />
      </View>
    </View>
  );
}
