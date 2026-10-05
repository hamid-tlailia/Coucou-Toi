import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { View, FlatList, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePrefs } from '../context/Prefs';
import { Txt, Input, Chip, Press, Tag, Skeleton, Empty } from '../components/ui';
import { SOURCES, STATUS_KEYS, STATUS_COLORS, PAY_COLORS, srcOf, GOLD } from '../theme';
import { formatTND } from '../lib/money';
import { listOrders, shortNo } from '../api/orders';
import { timeAgo, ltr } from '../lib/orderActions';

export default function OrdersScreen({ refreshKey, onOpenOrder }) {
  const { t, showToast } = usePrefs();
  const [orders, setOrders] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');
  const debounce = useRef(null);
  const reqId = useRef(0);

  const fetchOrders = useCallback(async (q = search) => {
    const id = ++reqId.current; // ignore out-of-order responses while typing
    try {
      const data = await listOrders({ search: q, status, source });
      if (id === reqId.current) setOrders(data.orders || []);
    } catch (e) {
      if (id === reqId.current) { setOrders((o) => o || []); showToast(e.code === 'network' ? t.offline : t.error, 'error'); }
    } finally {
      setRefreshing(false);
    }
  }, [search, status, source, t]);

  useEffect(() => { fetchOrders(); }, [status, source, refreshKey]);

  const onSearch = (v) => {
    setSearch(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchOrders(v), 260);
  };

  const renderItem = useCallback(({ item }) => <OrderCard order={item} onPress={() => onOpenOrder(item)} />, [onOpenOrder]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 10 }}>
        <Input icon="search" placeholder={t.searchPlaceholder} value={search} onChangeText={onSearch} returnKeyType="search" />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 12 }}>
          <Chip label={t.all} active={status === 'all'} onPress={() => setStatus('all')} />
          {STATUS_KEYS.map((k) => <Chip key={k} label={t[`st_${k}`]} active={status === k} color={STATUS_COLORS[k]} onPress={() => setStatus(k)} />)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 8 }}>
          <Chip label={t.all} icon="apps-outline" active={source === 'all'} onPress={() => setSource('all')} />
          {SOURCES.map((s) => <Chip key={s.key} label={t[`src_${s.key}`]} icon={s.icon} active={source === s.key} color={s.color} onPress={() => setSource(s.key)} />)}
        </ScrollView>
      </View>

      {orders === null ? (
        <View style={{ padding: 18, gap: 12 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={118} r={22} />)}</View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 140 }}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={9}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={GOLD} colors={[GOLD]} />}
          ListEmptyComponent={<Empty icon="bag-handle-outline" title={t.noOrders} sub={search ? null : t.noOrdersSub} />}
        />
      )}
    </View>
  );
}

export const OrderCard = memo(function OrderCard({ order, onPress }) {
  const { t, th } = usePrefs();
  const src = srcOf(order.source);
  return (
    <Press onPress={onPress} scale={0.98} style={{ backgroundColor: th.surface, borderRadius: 22, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: th.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: `${src.color}1F`, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={src.icon} size={22} color={src.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt w="b" size={16} numberOfLines={1} style={{ flexShrink: 1 }}>{order.customer}</Txt>
            <Txt w="m" size={11.5} color={th.faint}>{shortNo(order)}</Txt>
          </View>
          <Txt size={12.5} color={th.muted} numberOfLines={1} style={{ marginTop: 2 }}>
            {[order.city, order.items].filter(Boolean).join(' · ') || ltr(order.phone)}
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt w="x" size={16} color={th.accent}>{formatTND(order.total)}</Txt>
          <Txt size={11} color={th.faint} style={{ marginTop: 2 }}>{timeAgo(order.createdAt, t)}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
        <Tag label={t[`st_${order.status}`]} color={STATUS_COLORS[order.status]} />
        <Tag label={t[`pay_${order.pay}`]} color={PAY_COLORS[order.pay]} icon={order.pay === 'paid' ? 'checkmark-circle' : 'time-outline'} />
      </View>
    </Press>
  );
});
