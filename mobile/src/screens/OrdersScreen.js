import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Chip, Input } from '../components/ui';
import { SOURCES, STATUS_KEYS, srcOf, DEEP, PLUM, GOLD, GREEN, RED, shadow } from '../theme';
import { formatTND } from '../lib/money';
import { listOrders } from '../api/orders';

let debounceTimer = null;

export default function OrdersScreen({ t, th, theme, onOpenReceipt, onOpenWhatsApp, showToast, refreshKey }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const fetchOrders = useCallback(async (opts = {}) => {
    try {
      const data = await listOrders({ search, status: statusFilter, source: sourceFilter, ...opts });
      setOrders(data.orders || []);
    } catch {
      showToast?.(t.error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, sourceFilter]);

  useEffect(() => { fetchOrders(); }, [statusFilter, sourceFilter, refreshKey]);

  // Debounced search-as-you-type: matches barcode/tracking code, customer
  // name, or order number — server does the actual matching (see
  // GET /orders?q=  in server/src/routes/orders.js).
  const onSearchChange = (v) => {
    setSearch(v);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchOrders({ search: v }), 280);
  };

  const onRefresh = () => { setRefreshing(true); fetchOrders(); };

  const copyCode = async (code) => {
    await Clipboard.setStringAsync(code);
    showToast?.(`${t.copied}: ${code}`);
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14 }}>
      <View style={[styles.searchBox, { backgroundColor: th.surface, borderColor: th.border }]}>
        <Text style={{ color: th.muted, fontSize: 15 }}>🔎</Text>
        <Input
          th={th}
          value={search}
          onChangeText={onSearchChange}
          placeholder={t.searchPlaceholder}
          style={{ flex: 1, borderWidth: 0, paddingVertical: 4 }}
        />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PLUM} />}
        contentContainerStyle={{ paddingBottom: 110 }}
        ListHeaderComponent={
          <>
            <FilterRow th={th} value={sourceFilter} onChange={setSourceFilter} t={t} type="source" />
            <FilterRow th={th} value={statusFilter} onChange={setStatusFilter} t={t} type="status" />
          </>
        }
        ListEmptyComponent={!loading && (
          <Text style={{ textAlign: 'center', color: th.muted, marginTop: 40, fontSize: 13.5 }}>{t.noOrders}</Text>
        )}
        renderItem={({ item }) => (
          <OrderCard order={item} t={t} th={th} theme={theme} onReceipt={() => onOpenReceipt(item)} onWa={() => onOpenWhatsApp(item)} onCopy={() => copyCode(item.code)} />
        )}
      />
    </View>
  );
}

function FilterRow({ th, value, onChange, t, type }) {
  const items = type === 'source' ? SOURCES : STATUS_KEYS.map((k) => ({ key: k }));
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
      <Chip th={th} label={type === 'source' ? `📥 ${t.all}` : t.all} active={value === 'all'} onPress={() => onChange('all')} gradientColor={type === 'source' ? DEEP : GOLD} />
      {items.map((it) => (
        <Chip key={it.key} th={th} label={t[type === 'source' ? `src_${it.key}` : `st_${it.key}`]} active={value === it.key} onPress={() => onChange(it.key)} gradientColor={type === 'source' ? (it.color || PLUM) : GOLD} />
      ))}
    </View>
  );
}

function OrderCard({ order, t, th, theme, onReceipt, onWa, onCopy }) {
  const src = srcOf(order.source);
  const paid = order.pay === 'paid';
  return (
    <View style={[styles.card, { backgroundColor: th.surface, borderInlineStartColor: paid ? GREEN : RED }, shadow(4)]}>
      <View style={styles.row}>
        <Text style={{ fontWeight: '700', color: th.text, fontSize: 13.5 }}>#{order.id}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Tag color={src.color}>{t[`src_${order.source}`]}</Tag>
          <Tag color={th.raised} textColor={th.muted}>{t[`st_${order.status}`]}</Tag>
        </View>
      </View>
      <Text style={{ fontSize: 16.5, fontWeight: '600', marginTop: 10, color: th.text }}>{order.customer}</Text>
      <Text style={{ fontSize: 12.5, color: th.muted, marginVertical: 4 }}>{order.city} · {order.items}</Text>
      <View style={styles.row}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: theme === 'light' ? DEEP : '#E3C08A' }}>{formatTND(order.total)}</Text>
        <View style={[styles.payPill, { backgroundColor: paid ? '#E7F4EC' : '#FBEAE8' }]}>
          <Text style={{ color: paid ? GREEN : RED, fontSize: 11, fontWeight: '700' }}>{t[`pay_${order.pay}`]}</Text>
        </View>
      </View>
      <View style={[styles.codeBar, { backgroundColor: th.raised }]}>
        <Text numberOfLines={1} style={{ flex: 1, color: th.muted, fontSize: 11.5, letterSpacing: 1 }}>{order.code}</Text>
        <TouchableOpacity onPress={onCopy} style={[styles.copyBtn, { borderColor: th.border }]}>
          <Text style={{ fontSize: 11, color: th.text, fontWeight: '600' }}>⧉ {t.copyCode}</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <TouchableOpacity onPress={onReceipt} style={[styles.actBtn, { backgroundColor: th.raised }]}>
          <Text style={{ fontSize: 12, color: th.text, fontWeight: '600' }}>📄 {t.receipt}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onWa} style={[styles.actBtn, { backgroundColor: '#25D366' }]}>
          <Text style={{ fontSize: 12, color: '#FFF', fontWeight: '700' }}>💬 {t.whatsapp}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Tag({ children, color, textColor = '#FFF' }) {
  return (
    <View style={{ backgroundColor: color, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 }}>
      <Text style={{ fontSize: 10.5, fontWeight: '700', color: textColor }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 12, marginBottom: 12 },
  card: { borderRadius: 18, padding: 16, marginBottom: 14, borderInlineStartWidth: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  codeBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 8, borderRadius: 10 },
  copyBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  actBtn: { flex: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
});
