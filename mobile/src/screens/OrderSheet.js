import React, { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../components/BottomSheet';
import { usePrefs } from '../context/Prefs';
import { Txt, Press, Chip, Button, Divider, haptic } from '../components/ui';
import { STATUS_KEYS, STATUS_COLORS, PAY_KEYS, PAY_COLORS, srcOf, GREEN } from '../theme';
import { formatTND } from '../lib/money';
import { updateOrder, deleteOrder, shortNo } from '../api/orders';
import { sendWhatsApp, callCustomer, ltr } from '../lib/orderActions';
import { trackingUrl } from '../config';

/** Full order view: change status/payment, invoice, contact, edit, delete. */
export default function OrderSheet({ order: initial, onClose, onChanged, onInvoice, onEdit }) {
  const { t, th, showToast } = usePrefs();
  const [order, setOrder] = useState(initial);
  useEffect(() => { if (initial) setOrder(initial); }, [initial]);

  if (!order) return <BottomSheet visible={false} onClose={onClose} />;
  const src = srcOf(order.source);
  const stepAt = STATUS_KEYS.indexOf(order.status);

  const patch = async (p) => {
    const before = order;
    setOrder({ ...order, ...p }); // optimistic — feels instant
    try {
      const updated = await updateOrder(order.id, p);
      setOrder(updated);
      onChanged?.(updated);
      haptic('success');
    } catch {
      setOrder(before);
      showToast(t.error, 'error');
    }
  };

  const remove = () => Alert.alert(t.deleteOrder, t.deleteConfirm, [
    { text: t.cancel, style: 'cancel' },
    { text: t.delete, style: 'destructive', onPress: async () => {
      try { await deleteOrder(order.id); showToast(t.deleted); onChanged?.(null); onClose(); } catch { showToast(t.error, 'error'); }
    } },
  ]);

  const copyLink = async () => { await Clipboard.setStringAsync(trackingUrl(order.code)); showToast(t.copied); };

  return (
    <BottomSheet visible={!!initial} onClose={onClose}>
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: `${src.color}22`, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={src.icon} size={28} color={src.color} />
        </View>
        <Txt w="x" size={21} style={{ marginTop: 10 }}>{order.customer}</Txt>
        <Txt size={13} color={th.muted} style={{ marginTop: 2 }}>{ltr(shortNo(order))} · {ltr(order.phone)}</Txt>
        <Txt w="x" size={28} color={th.accent} style={{ marginTop: 8 }}>{formatTND(order.total)}</Txt>
      </View>

      {(order.items || order.city) && (
        <View style={{ backgroundColor: th.surface, borderRadius: 18, padding: 14, marginTop: 16, borderWidth: 1, borderColor: th.border, gap: 8 }}>
          {!!order.items && <Row icon="pricetags-outline" text={order.items} />}
          {!!order.city && <Row icon="location-outline" text={order.city} />}
        </View>
      )}

      {/* Status stepper */}
      <Txt w="b" size={13} color={th.muted} style={{ marginTop: 18, marginBottom: 10 }}>{t.status}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {STATUS_KEYS.map((k, i) => {
          const done = i <= stepAt;
          const c = STATUS_COLORS[k];
          return (
            <Press key={k} onPress={() => patch({ status: k })} style={{ flex: 1, alignItems: 'center' }} scale={0.92}>
              <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                <View style={{ flex: 1, height: 3, backgroundColor: i === 0 ? 'transparent' : i <= stepAt ? STATUS_COLORS[order.status] : th.raised }} />
                <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? c : th.raised, borderWidth: k === order.status ? 3 : 0, borderColor: `${c}55` }}>
                  {done && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </View>
                <View style={{ flex: 1, height: 3, backgroundColor: i === STATUS_KEYS.length - 1 ? 'transparent' : i < stepAt ? STATUS_COLORS[order.status] : th.raised }} />
              </View>
              <Txt w={k === order.status ? 'b' : 'm'} size={11.5} color={k === order.status ? th.text : th.muted} style={{ marginTop: 6, textAlign: 'center' }}>{t[`st_${k}`]}</Txt>
            </Press>
          );
        })}
      </View>

      <Txt w="b" size={13} color={th.muted} style={{ marginTop: 18, marginBottom: 10 }}>{t.payStatus}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
        {PAY_KEYS.map((p) => (
          <Chip key={p} label={t[`pay_${p}`]} active={order.pay === p} color={PAY_COLORS[p]}
            icon={p === 'paid' ? 'checkmark-circle-outline' : p === 'cod' ? 'cash-outline' : 'time-outline'}
            onPress={() => patch({ pay: p })} />
        ))}
      </View>

      <Divider />

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Action icon="document-text-outline" label={t.invoice} onPress={() => onInvoice(order)} />
          <Action icon="logo-whatsapp" label={t.src_whatsapp} color={GREEN} onPress={() => sendWhatsApp(order, t)} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Action icon="call-outline" label={t.call} onPress={() => callCustomer(order)} />
          <Action icon="link-outline" label={t.copyLink} onPress={copyLink} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <Button title={t.edit} icon="create-outline" variant="ghost" onPress={() => onEdit(order)} style={{ flex: 1 }} small />
        <Button title={t.delete} icon="trash-outline" variant="danger" onPress={remove} style={{ flex: 1 }} small />
      </View>
    </BottomSheet>
  );
}

function Row({ icon, text }) {
  const { th } = usePrefs();
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Ionicons name={icon} size={17} color={th.accent} style={{ marginTop: 2 }} />
      <Txt w="m" size={14} style={{ flex: 1, lineHeight: 22 }}>{text}</Txt>
    </View>
  );
}

function Action({ icon, label, onPress, color }) {
  const { th } = usePrefs();
  return (
    <Press onPress={onPress} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: th.surface, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: th.border }}>
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: `${color || th.accent}1F`, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={20} color={color || th.accent} />
      </View>
      <Txt w="b" size={14} style={{ flex: 1 }} numberOfLines={1}>{label}</Txt>
    </Press>
  );
}
