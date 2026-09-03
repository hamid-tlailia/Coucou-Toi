import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import BottomSheet from '../components/BottomSheet';
import { Chip, FieldLabel, Input, PrimaryButton, GhostButton } from '../components/ui';
import { SOURCES, PAY_KEYS, DEEP, PLUM, RED } from '../theme';
import { createOrder } from '../api/orders';

export default function AddOrderSheet({ visible, onClose, t, th, quotaLeft, quota, onCreated, onLimit }) {
  const [f, setF] = useState({ customer: '', phone: '', city: '', items: '', total: '', source: 'manual', pay: 'unpaid' });
  const [saving, setSaving] = useState(false);

  const reset = () => setF({ customer: '', phone: '', city: '', items: '', total: '', source: 'manual', pay: 'unpaid' });

  const save = async () => {
    if (!f.customer || !f.phone || !f.total) return Alert.alert(t.required);
    if (quotaLeft <= 0) { onClose(); onLimit(); return; }
    setSaving(true);
    try {
      const order = await createOrder({
        customer: f.customer, phone: f.phone, city: f.city, items: f.items,
        total: parseFloat(f.total.replace(',', '.')) || 0, source: f.source, pay: f.pay,
      });
      reset();
      onClose();
      onCreated(order);
    } catch (e) {
      if (e.status === 402) { onClose(); onLimit(); } // server-enforced quota — authoritative
      else Alert.alert(t.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} th={th}>
      <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center', color: th.text }}>{t.addOrder}</Text>
      <Text style={{ fontSize: 11, textAlign: 'center', marginTop: 6, color: quotaLeft <= 3 ? RED : th.muted }}>
        {quotaLeft} / {quota}
      </Text>

      <FieldLabel th={th}>{t.source}</FieldLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {SOURCES.map((s) => (
          <Chip key={s.key} th={th} label={t[`src_${s.key}`]} active={f.source === s.key} gradientColor={s.color} onPress={() => setF({ ...f, source: s.key })} />
        ))}
      </View>

      <FieldLabel th={th}>{t.customer} *</FieldLabel>
      <Input th={th} value={f.customer} onChangeText={(v) => setF({ ...f, customer: v })} />
      <FieldLabel th={th}>{t.phone} *</FieldLabel>
      <Input th={th} keyboardType="phone-pad" placeholder="21620123456" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} />
      <FieldLabel th={th}>{t.city}</FieldLabel>
      <Input th={th} value={f.city} onChangeText={(v) => setF({ ...f, city: v })} />
      <FieldLabel th={th}>{t.products}</FieldLabel>
      <Input th={th} value={f.items} onChangeText={(v) => setF({ ...f, items: v })} />
      <FieldLabel th={th}>{t.amount} (د.ت) *</FieldLabel>
      <Input th={th} keyboardType="decimal-pad" placeholder="0.000" value={f.total} onChangeText={(v) => setF({ ...f, total: v })} />

      <FieldLabel th={th}>{t.payStatus}</FieldLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {PAY_KEYS.map((p) => (
          <Chip key={p} th={th} label={t[`pay_${p}`]} active={f.pay === p} gradientColor={DEEP} onPress={() => setF({ ...f, pay: p })} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 9, marginTop: 22 }}>
        <GhostButton th={th} title={t.cancel} onPress={onClose} style={{ flex: 0.4 }} />
        <PrimaryButton th={th} title={t.save} onPress={save} loading={saving} style={{ flex: 0.6 }} />
      </View>
    </BottomSheet>
  );
}
