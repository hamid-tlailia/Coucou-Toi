import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Chip, Input, FieldLabel, PrimaryButton, GhostButton } from '../components/ui';
import { PAY_KEYS, srcOf, DEEP, GREEN, RED, GOLD, shadow } from '../theme';
import { formatTND } from '../lib/money';
import { listPendingOrders, approvePendingOrder, rejectPendingOrder } from '../api/pendingOrders';

export default function SmartOrdersScreen({ t, th, theme, showToast, onApproved, onCountChange, refreshKey }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openId, setOpenId] = useState(null);

  const fetchDrafts = useCallback(async () => {
    try {
      const data = await listPendingOrders();
      setDrafts(data.pendingOrders || []);
      onCountChange?.((data.pendingOrders || []).length);
    } catch {
      showToast?.(t.error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDrafts(); }, [refreshKey]);

  const onRefresh = () => { setRefreshing(true); fetchDrafts(); };

  const onApprove = async (id, overrides) => {
    try {
      const { order } = await approvePendingOrder(id, overrides);
      setDrafts((ds) => ds.filter((d) => d.id !== id));
      onCountChange?.((c) => Math.max(0, (typeof c === 'number' ? c : 0) - 1));
      setOpenId(null);
      showToast?.(t.approvedToast);
      onApproved?.(order);
    } catch (e) {
      if (e.status === 400) Alert.alert(t.missingFields);
      else if (e.status === 402) Alert.alert(t.error);
      else Alert.alert(t.error);
    }
  };

  const onReject = async (id) => {
    try {
      await rejectPendingOrder(id);
      setDrafts((ds) => ds.filter((d) => d.id !== id));
      setOpenId(null);
      showToast?.(t.rejectedToast);
    } catch {
      Alert.alert(t.error);
    }
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: th.text }}>{t.smartTitle}</Text>
      <Text style={{ fontSize: 12, color: th.muted, marginTop: 4, marginBottom: 10 }}>{t.smartHint}</Text>

      <FlatList
        data={drafts}
        keyExtractor={(d) => d.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={DEEP} />}
        contentContainerStyle={{ paddingBottom: 110 }}
        ListEmptyComponent={!loading && (
          <Text style={{ textAlign: 'center', color: th.muted, marginTop: 40, fontSize: 13.5 }}>{t.smartEmpty}</Text>
        )}
        renderItem={({ item }) => (
          <DraftCard
            draft={item} t={t} th={th} theme={theme}
            open={openId === item.id}
            onToggle={() => setOpenId(openId === item.id ? null : item.id)}
            onApprove={onApprove}
            onReject={onReject}
          />
        )}
      />
    </View>
  );
}

function DraftCard({ draft, t, th, theme, open, onToggle, onApprove, onReject }) {
  const src = srcOf(draft.source);
  const [f, setF] = useState({
    customer: draft.customer || '', phone: draft.phone || '', city: draft.city || '',
    items: draft.items || '', total: draft.total != null ? String(draft.total) : '', pay: draft.pay || 'cod',
  });

  const confidencePct = Math.round((draft.confidence ?? 0) * 100);
  const confidenceColor = confidencePct >= 70 ? GREEN : confidencePct >= 40 ? GOLD : RED;

  const submit = () => {
    onApprove(draft.id, {
      customer: f.customer, phone: f.phone, city: f.city, items: f.items,
      total: parseFloat(String(f.total).replace(',', '.')) || 0, pay: f.pay,
    });
  };

  return (
    <View style={[styles.card, { backgroundColor: th.surface }, shadow(4)]}>
      <View style={styles.row}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Tag color={src.color}>{t[`src_${draft.source}`]}</Tag>
          <Tag color={confidenceColor}>{t.confidence}: {confidencePct}%</Tag>
        </View>
      </View>

      <Text style={{ fontSize: 15.5, fontWeight: '700', marginTop: 10, color: th.text }}>
        {draft.customer || '—'}
      </Text>
      <Text style={{ fontSize: 12.5, color: th.muted, marginVertical: 4 }}>
        {draft.city || '—'} · {draft.items || '—'}
      </Text>
      {draft.total != null && (
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme === 'light' ? DEEP : '#E3C08A' }}>
          {formatTND(draft.total)}
        </Text>
      )}

      {!!draft.rawText && (
        <View style={[styles.rawBox, { backgroundColor: th.raised }]}>
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: th.muted, marginBottom: 3 }}>{t.rawMessage}</Text>
          <Text numberOfLines={open ? undefined : 2} style={{ fontSize: 12, color: th.text }}>{draft.rawText}</Text>
        </View>
      )}

      <TouchableOpacity onPress={onToggle} style={{ marginTop: 10 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '700', color: DEEP }}>
          {open ? `▲ ${t.reviewEdit}` : `▼ ${t.reviewEdit}`}
        </Text>
      </TouchableOpacity>

      {open && (
        <View style={{ marginTop: 4 }}>
          <FieldLabel th={th}>{t.customer}</FieldLabel>
          <Input th={th} value={f.customer} onChangeText={(v) => setF({ ...f, customer: v })} />
          <FieldLabel th={th}>{t.phone}</FieldLabel>
          <Input th={th} keyboardType="phone-pad" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} />
          <FieldLabel th={th}>{t.city}</FieldLabel>
          <Input th={th} value={f.city} onChangeText={(v) => setF({ ...f, city: v })} />
          <FieldLabel th={th}>{t.products}</FieldLabel>
          <Input th={th} value={f.items} onChangeText={(v) => setF({ ...f, items: v })} />
          <FieldLabel th={th}>{t.amount} (د.ت)</FieldLabel>
          <Input th={th} keyboardType="decimal-pad" value={f.total} onChangeText={(v) => setF({ ...f, total: v })} />
          <FieldLabel th={th}>{t.payStatus}</FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {PAY_KEYS.map((p) => (
              <Chip key={p} th={th} label={t[`pay_${p}`]} active={f.pay === p} gradientColor={DEEP} onPress={() => setF({ ...f, pay: p })} />
            ))}
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <GhostButton th={th} title={t.rejectOrder} onPress={() => onReject(draft.id)} style={{ flex: 0.35, backgroundColor: '#FBEAE8' }} color={RED} />
        <PrimaryButton th={th} title={t.approveOrder} onPress={submit} style={{ flex: 0.65 }} />
      </View>
    </View>
  );
}

function Tag({ children, color }) {
  return (
    <View style={{ backgroundColor: color, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 }}>
      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#FFF' }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 16, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rawBox: { borderRadius: 10, padding: 9, marginTop: 10 },
});
