import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, RefreshControl, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { usePrefs } from '../context/Prefs';
import StockAlert from '../components/StockAlert';
import { Txt, Card, Input, Chip, Button, Press, Tag, Empty, Skeleton, haptic } from '../components/ui';
import { SOURCES, PAY_KEYS, PAY_COLORS, srcOf, GOLD, GREEN, RED } from '../theme';
import { formatTND } from '../lib/money';
import { listPendingOrders, approvePendingOrder, rejectPendingOrder, draftFromText } from '../api/pendingOrders';

export default function SmartOrdersScreen({ refreshKey, onApproved, onCountChange }) {
  const { t, th, showToast } = usePrefs();
  const [drafts, setDrafts] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState('');
  const [source, setSource] = useState('whatsapp');
  const [extracting, setExtracting] = useState(false);

  const fetchDrafts = useCallback(async () => {
    try {
      const data = await listPendingOrders();
      setDrafts(data.pendingOrders || []);
      onCountChange?.((data.pendingOrders || []).length);
    } catch {
      setDrafts((d) => d || []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDrafts(); }, [refreshKey]);

  const extract = async () => {
    if (text.trim().length < 3) return;
    setExtracting(true);
    try {
      const draft = await draftFromText(text.trim(), source);
      setDrafts((ds) => [draft, ...(ds || [])]);
      onCountChange?.((drafts?.length || 0) + 1);
      setText('');
      haptic('success');
      const msg = { ok: t.draftCreated, no_key: t.aiNoKey, failed: t.aiFailed }[draft.aiStatus] || t.draftCreated;
      showToast(msg, draft.aiStatus === 'ok' ? 'ok' : 'info');
    } catch (e) {
      showToast(e.code === 'network' ? t.offline : t.error, 'error');
    } finally {
      setExtracting(false);
    }
  };

  const remove = (id) => setDrafts((ds) => {
    const next = ds.filter((d) => d.id !== id);
    onCountChange?.(next.length);
    return next;
  });

  const approve = async (id, overrides) => {
    try {
      const { order } = await approvePendingOrder(id, overrides);
      remove(id);
      haptic('success');
      showToast(t.approvedToast);
      onApproved?.(order);
    } catch (e) {
      showToast(e.status === 400 ? t.missingFields : t.error, 'error');
    }
  };

  const reject = async (id) => {
    try { await rejectPendingOrder(id); remove(id); showToast(t.rejectedToast, 'info'); } catch { showToast(t.error, 'error'); }
  };

  const header = (
    <>
      <Card style={{ marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: `${GOLD}22`, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="sparkles" size={20} color={GOLD} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt w="b" size={16}>{t.smartTitle}</Txt>
            <Txt size={12.5} color={th.muted}>{t.smartHint}</Txt>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
          {SOURCES.filter((s) => s.key !== 'manual').map((s) => (
            <Chip key={s.key} label={t[`src_${s.key}`]} icon={s.icon} color={s.color} active={source === s.key} onPress={() => setSource(s.key)} />
          ))}
        </ScrollView>
        <Input multiline placeholder={t.pastePlaceholder} value={text} onChangeText={setText} style={{ marginTop: 12 }} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <Button small variant="ghost" icon="clipboard-outline" title={t.paste} style={{ flex: 0.4 }}
            onPress={async () => setText(await Clipboard.getStringAsync())} />
          <Button small icon="sparkles-outline" title={extracting ? t.extracting : t.extract} loading={extracting}
            disabled={text.trim().length < 3} onPress={extract} style={{ flex: 0.6 }} />
        </View>
      </Card>
      <Txt w="b" size={16.5} style={{ marginBottom: 12 }}>{t.drafts}{drafts?.length ? ` (${drafts.length})` : ''}</Txt>
    </>
  );

  return (
    <FlatList
      data={drafts || []}
      keyExtractor={(d) => d.id}
      contentContainerStyle={{ padding: 18, paddingBottom: 140 }}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDrafts(); }} tintColor={GOLD} colors={[GOLD]} />}
      ListEmptyComponent={drafts === null
        ? <View style={{ gap: 12 }}><Skeleton h={130} r={22} /><Skeleton h={130} r={22} /></View>
        : <Empty icon="chatbubbles-outline" title={t.smartEmpty} />}
      renderItem={({ item }) => <DraftCard draft={item} onApprove={approve} onReject={reject} />}
    />
  );
}

function DraftCard({ draft, onApprove, onReject }) {
  const { t, th } = usePrefs();
  const src = srcOf(draft.source);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    customer: draft.customer || '', phone: draft.phone || '', city: [draft.city, draft.address].filter(Boolean).join(' - '),
    items: draft.items || '', total: draft.total != null ? String(draft.total) : '', pay: draft.pay || 'cod',
  });
  const pct = Math.round((draft.confidence ?? 0) * 100);
  const pctColor = pct >= 70 ? GREEN : pct >= 40 ? GOLD : RED;
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const approve = async () => {
    setBusy(true);
    const total = parseFloat(String(f.total).replace(',', '.'));
    const body = { pay: f.pay };
    if (f.customer.trim()) body.customer = f.customer.trim();
    if (f.phone.trim()) body.phone = f.phone.trim();
    if (f.city.trim()) body.city = f.city.trim();
    if (f.items.trim()) body.items = f.items.trim();
    if (!Number.isNaN(total)) body.total = total;
    await onApprove(draft.id, body);
    setBusy(false);
  };

  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Tag label={t[`src_${draft.source}`]} color={src.color} icon={src.icon} />
        <Tag label={`${t.confidence} ${pct}%`} color={pctColor} />
      </View>
      <Txt w="b" size={16} style={{ marginTop: 10 }}>{draft.customer || '—'}</Txt>
      <Txt size={13} color={th.muted} style={{ marginTop: 2 }}>{[draft.city, draft.items].filter(Boolean).join(' · ') || '—'}</Txt>
      {draft.total != null && <Txt w="x" size={17} color={th.accent} style={{ marginTop: 4 }}>{formatTND(draft.total)}</Txt>}

      <StockAlert order={draft} compact />

      {!!draft.rawText && (
        <View style={{ backgroundColor: th.raised, borderRadius: 14, padding: 11, marginTop: 10 }}>
          <Txt w="b" size={11} color={th.muted} style={{ marginBottom: 3 }}>{t.rawMessage}</Txt>
          <Txt size={13} numberOfLines={open ? undefined : 2} style={{ lineHeight: 20 }}>{draft.rawText}</Txt>
        </View>
      )}

      <Press onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
        <Ionicons name={open ? 'chevron-up' : 'create-outline'} size={16} color={th.accent} />
        <Txt w="b" size={13} color={th.accent}>{t.edit}</Txt>
      </Press>

      {open && (
        <View>
          <Input label={t.customer} value={f.customer} onChangeText={set('customer')} />
          <Input label={t.phone} keyboardType="phone-pad" value={f.phone} onChangeText={set('phone')} />
          <Input label={t.city} value={f.city} onChangeText={set('city')} />
          <Input label={t.products} value={f.items} onChangeText={set('items')} />
          <Input label={`${t.amount} (د.ت)`} keyboardType="decimal-pad" value={f.total} onChangeText={set('total')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginTop: 12 }}>
            {PAY_KEYS.map((p) => <Chip key={p} label={t[`pay_${p}`]} color={PAY_COLORS[p]} active={f.pay === p} onPress={() => set('pay')(p)} />)}
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Button small variant="danger" icon="close" title={t.rejectOrder} onPress={() => onReject(draft.id)} style={{ flex: 0.38 }} />
        <Button small icon="checkmark-done" title={t.approveOrder} onPress={approve} loading={busy} style={{ flex: 0.62 }} />
      </View>
    </Card>
  );
}
