import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePrefs } from '../context/Prefs';
import { Txt, Card, SectionTitle, Press, Skeleton, FadeIn, Button } from '../components/ui';
import { AreaChart, PairBars, Ring, ShareBar } from '../components/Charts';
import { getDashboard } from '../api/orders';
import { formatTND } from '../lib/money';
import { GOLD, GOLD_L, BLUE, GREEN, RED, PLUM, SOURCES, STATUS_KEYS, STATUS_COLORS } from '../theme';

const compact = (n) => formatTND(n).replace('.000', '');

export default function DashboardScreen({ refreshKey, goTo }) {
  const { t, th } = usePrefs();
  const [days, setDays] = useState(14);
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setD(await getDashboard(days));
      setErr(false);
    } catch {
      setErr(true);
    } finally {
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (!d) {
    return err ? (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Ionicons name="cloud-offline-outline" size={48} color={th.muted} />
        <Txt w="b" size={16} style={{ marginTop: 12 }}>{t.offline}</Txt>
        <Button title={t.retry} icon="refresh" variant="outline" small onPress={load} style={{ marginTop: 16 }} />
      </View>
    ) : <DashSkeleton />;
  }

  const { current, previous } = d.period;
  const delta = previous.revenue ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : null;
  const collectRate = d.kpis.revenue ? d.kpis.collected / d.kpis.revenue : 0;
  const totalBySource = Object.values(d.bySource).reduce((s, x) => s + x.count, 0);
  const totalByStatus = Object.values(d.byStatus).reduce((s, x) => s + x, 0);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 18, paddingBottom: 130 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={GOLD} colors={[GOLD]} />}
    >
      {/* Range */}
      <View style={{ flexDirection: 'row', backgroundColor: th.surface, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: th.border, marginBottom: 16 }}>
        {[7, 14, 30].map((n) => (
          <Press key={n} onPress={() => setDays(n)} style={{ flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center', backgroundColor: days === n ? th.raised : 'transparent' }}>
            <Txt w={days === n ? 'b' : 'm'} size={13} color={days === n ? th.accent : th.muted}>{n} {t.days}</Txt>
          </Press>
        ))}
      </View>

      {/* Hero */}
      <FadeIn>
        <LinearGradient colors={th.heroGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 28, padding: 20, borderWidth: 1, borderColor: 'rgba(212,175,106,0.28)', overflow: 'hidden' }}>
          <Txt w="m" size={13} color="rgba(246,240,232,0.7)">{t.revenueChart} · {days} {t.days}</Txt>
          <Txt w="x" size={34} color="#F6F0E8" style={{ marginTop: 4 }}>{formatTND(current.revenue)}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            {delta != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: delta >= 0 ? 'rgba(76,183,130,0.18)' : 'rgba(224,101,91,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Ionicons name={delta >= 0 ? 'trending-up' : 'trending-down'} size={14} color={delta >= 0 ? GREEN : RED} />
                <Txt w="b" size={12} color={delta >= 0 ? GREEN : RED}>{Math.abs(delta).toFixed(0)}%</Txt>
              </View>
            )}
            <Txt size={12} color="rgba(246,240,232,0.6)">{current.orders} {t.ordersCount} · {delta != null ? t.vsPrev : ''}</Txt>
          </View>
          <View style={{ marginTop: 14, marginHorizontal: -6 }}>
            <AreaChart values={d.series.map((s) => s.revenue)} color={GOLD_L} height={110} gridColor="rgba(255,255,255,0.08)" />
          </View>
        </LinearGradient>
      </FadeIn>

      {/* Today */}
      <FadeIn delay={60} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
        <Tile icon="bag-handle-outline" color={GOLD} label={t.ordersToday} value={String(d.today.orders)} />
        <Tile icon="cash-outline" color={GREEN} label={t.revenueToday} value={compact(d.today.revenue)} />
        <Tile icon="eye-outline" color={BLUE} label={t.appVisits} value={String(d.today.visits)} />
        <Tile icon="navigate-outline" color={PLUM} label={t.trackingViews} value={String(d.today.trackingViews)} />
      </FadeIn>

      {/* KPIs */}
      <FadeIn delay={120}>
        <Card style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <Ring pct={collectRate} color={GREEN} label={`${Math.round(collectRate * 100)}%`} sub={t.collectionRate} size={100} />
            <View style={{ flex: 1, gap: 10 }}>
              <Kpi label={t.revenue} value={formatTND(d.kpis.revenue)} color={GOLD} />
              <Kpi label={t.collected} value={formatTND(d.kpis.collected)} color={GREEN} />
              <Kpi label={t.outstanding} value={formatTND(d.kpis.outstanding)} color={RED} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 16, borderTopWidth: 1, borderColor: th.border, paddingTop: 14 }}>
            <Mini label={t.totalOrders} value={String(d.kpis.totalOrders)} />
            <Mini label={t.avgOrder} value={formatTND(d.kpis.avgOrder)} />
          </View>
        </Card>
      </FadeIn>

      {/* Orders chart */}
      <FadeIn delay={160}>
        <Card style={{ marginTop: 14 }}>
          <SectionTitle title={t.ordersChart} right={<Txt w="b" color={BLUE}>{current.orders}</Txt>} />
          <AreaChart values={d.series.map((s) => s.orders)} color={BLUE} height={120} />
          <AxisLabels series={d.series} />
        </Card>
      </FadeIn>

      {/* Visits */}
      <FadeIn delay={200}>
        <Card style={{ marginTop: 14 }}>
          <SectionTitle title={t.visits} />
          <Txt size={12} color={th.muted} style={{ marginTop: -6, marginBottom: 14 }}>{t.visitsHint}</Txt>
          <PairBars data={d.series.map((s) => ({ a: s.visits, b: s.trackingViews }))} colorA={GOLD} colorB={BLUE} height={110} />
          <AxisLabels series={d.series} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Legend color={GOLD} label={t.appVisits} value={d.visits.appOpens} />
            <Legend color={BLUE} label={t.trackingViews} value={d.visits.trackingViews} />
          </View>
        </Card>
      </FadeIn>

      {/* Status */}
      <FadeIn delay={240}>
        <Card style={{ marginTop: 14 }}>
          <SectionTitle title={t.byStatus} right={<Press onPress={() => goTo('orders')}><Txt w="b" size={13} color={th.accent}>{t.seeAll}</Txt></Press>} />
          {STATUS_KEYS.map((k) => {
            const c = d.byStatus[k] || 0;
            return <ShareBar key={k} label={t[`st_${k}`]} value={String(c)} pct={totalByStatus ? (c / totalByStatus) * 100 : 0} color={STATUS_COLORS[k]} />;
          })}
        </Card>
      </FadeIn>

      {/* Sources */}
      <FadeIn delay={280}>
        <Card style={{ marginTop: 14 }}>
          <SectionTitle title={t.bySource} />
          {SOURCES.map((s) => {
            const x = d.bySource[s.key] || { count: 0, total: 0 };
            return (
              <ShareBar key={s.key} label={t[`src_${s.key}`]} value={`${x.count} · ${compact(x.total)}`}
                pct={totalBySource ? (x.count / totalBySource) * 100 : 0} color={s.color}
                icon={<Ionicons name={s.icon} size={16} color={s.color} />} />
            );
          })}
        </Card>
      </FadeIn>

      {/* Top customers & cities */}
      <FadeIn delay={320}>
        <Card style={{ marginTop: 14 }}>
          <SectionTitle title={t.topCustomers} />
          {d.topCustomers.length === 0 && <Txt color={th.muted}>{t.noData}</Txt>}
          {d.topCustomers.map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderColor: th.border }}>
              <LinearGradient colors={i === 0 ? ['#F0D49A', '#A87D3E'] : [th.raised, th.raised]} style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                <Txt w="x" size={15} color={i === 0 ? '#1A1214' : th.accent}>{(c.name || '?').trim()[0]}</Txt>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Txt w="b" size={14} numberOfLines={1}>{c.name}</Txt>
                <Txt size={12} color={th.muted}>{c.orders} {t.ordersCount}</Txt>
              </View>
              <Txt w="b" size={14} color={th.accent}>{formatTND(c.total)}</Txt>
            </View>
          ))}
        </Card>

        <Card style={{ marginTop: 14 }}>
          <SectionTitle title={t.topCities} />
          {d.topCities.length === 0 && <Txt color={th.muted}>{t.noData}</Txt>}
          {d.topCities.map((c) => (
            <ShareBar key={c.city} label={c.city} value={`${c.orders} · ${compact(c.total)}`}
              pct={(c.orders / (d.topCities[0]?.orders || 1)) * 100} color={PLUM}
              icon={<Ionicons name="location-outline" size={15} color={th.muted} />} />
          ))}
        </Card>
      </FadeIn>

      {/* AI funnel */}
      <FadeIn delay={360}>
        <Press onPress={() => goTo('smart')} scale={0.98}>
          <Card style={{ marginTop: 14 }}>
            <SectionTitle title={`🤖 ${t.aiFunnel}`} right={<Ionicons name="chevron-back" size={18} color={th.muted} />} />
            <View style={{ flexDirection: 'row' }}>
              <Mini label={t.d_pending} value={String(d.drafts.pending || 0)} color={GOLD} />
              <Mini label={t.d_approved} value={String(d.drafts.approved || 0)} color={GREEN} />
              <Mini label={t.d_rejected} value={String(d.drafts.rejected || 0)} color={RED} />
            </View>
          </Card>
        </Press>
      </FadeIn>
    </ScrollView>
  );
}

function Tile({ icon, color, label, value }) {
  const { th } = usePrefs();
  return (
    <View style={{ width: '48.4%', backgroundColor: th.surface, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: th.border }}>
      <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Txt w="x" size={20} numberOfLines={1} adjustsFontSizeToFit>{value}</Txt>
      <Txt size={12} color={th.muted} style={{ marginTop: 2 }}>{label}</Txt>
    </View>
  );
}

function Kpi({ label, value, color }) {
  const { th } = usePrefs();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Txt size={12.5} color={th.muted} style={{ flex: 1 }}>{label}</Txt>
      <Txt w="b" size={13.5}>{value}</Txt>
    </View>
  );
}

function Mini({ label, value, color }) {
  const { th } = usePrefs();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Txt w="x" size={19} color={color || th.text}>{value}</Txt>
      <Txt size={11.5} color={th.muted} style={{ marginTop: 2, textAlign: 'center' }}>{label}</Txt>
    </View>
  );
}

function Legend({ color, label, value }) {
  const { th } = usePrefs();
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: th.raised, borderRadius: 14, padding: 10 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <View style={{ flex: 1 }}>
        <Txt size={11.5} color={th.muted}>{label}</Txt>
        <Txt w="x" size={16}>{value}</Txt>
      </View>
    </View>
  );
}

function AxisLabels({ series }) {
  const { th } = usePrefs();
  const pick = [0, Math.floor(series.length / 2), series.length - 1];
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
      {pick.map((i) => (
        <Txt key={i} size={10.5} color={th.faint}>{series[i]?.day.slice(5).replace('-', '/')}</Txt>
      ))}
    </View>
  );
}

function DashSkeleton() {
  return (
    <View style={{ padding: 18, gap: 14 }}>
      <Skeleton h={44} r={16} />
      <Skeleton h={230} r={28} />
      <View style={{ flexDirection: 'row', gap: 10 }}><Skeleton h={100} r={20} w="48.5%" /><Skeleton h={100} r={20} w="48.5%" /></View>
      <Skeleton h={180} r={24} />
    </View>
  );
}
