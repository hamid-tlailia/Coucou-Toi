import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import BottomSheet from '../components/BottomSheet';
import { usePrefs } from '../context/Prefs';
import { Txt, Input, Chip, Button, haptic } from '../components/ui';
import { SOURCES, PAY_KEYS, PAY_COLORS, RED } from '../theme';
import { createOrder, updateOrder } from '../api/orders';

const EMPTY = { customer: '', phone: '', city: '', items: '', total: '', source: 'manual', pay: 'cod' };

/** Create a new order, or edit an existing one when `editing` is passed. */
export default function AddOrderSheet({ visible, editing, onClose, onSaved }) {
  const { t, th, showToast } = usePrefs();
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!visible) return;
    setErr('');
    setF(editing
      ? { customer: editing.customer, phone: editing.phone, city: editing.city || '', items: editing.items || '', total: String(editing.total), source: editing.source, pay: editing.pay }
      : EMPTY);
  }, [visible, editing]);

  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    const total = parseFloat(String(f.total).replace(',', '.'));
    if (!f.customer.trim() || f.phone.trim().length < 4 || Number.isNaN(total)) { haptic('error'); return setErr(t.required); }
    setSaving(true);
    const body = { customer: f.customer.trim(), phone: f.phone.trim(), city: f.city.trim(), items: f.items.trim(), total, pay: f.pay };
    try {
      const order = editing ? await updateOrder(editing.id, body) : await createOrder({ ...body, source: f.source });
      haptic('success');
      showToast(editing ? t.updated : t.approvedToast);
      onSaved(order, !editing);
    } catch (e) {
      showToast(e.code === 'network' ? t.offline : t.error, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={editing ? t.editOrder : t.addOrder}>
      {!editing && (
        <>
          <Txt w="b" size={12.5} color={th.muted} style={{ marginTop: 12, marginBottom: 8 }}>{t.source}</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {SOURCES.map((s) => (
              <Chip key={s.key} label={t[`src_${s.key}`]} icon={s.icon} color={s.color} active={f.source === s.key} onPress={() => set('source')(s.key)} />
            ))}
          </ScrollView>
        </>
      )}

      <Input label={`${t.customer} *`} icon="person-outline" value={f.customer} onChangeText={set('customer')} />
      <Input label={`${t.phone} *`} icon="call-outline" keyboardType="phone-pad" placeholder="22 123 456" value={f.phone} onChangeText={set('phone')} />
      <Input label={t.city} icon="location-outline" value={f.city} onChangeText={set('city')} />
      <Input label={t.products} icon="pricetags-outline" value={f.items} onChangeText={set('items')} multiline placeholder="فستان أحمر M ×1" />
      <Input label={`${t.amount} (د.ت) *`} icon="cash-outline" keyboardType="decimal-pad" placeholder="0.000" value={f.total} onChangeText={set('total')} />

      <Txt w="b" size={12.5} color={th.muted} style={{ marginTop: 14, marginBottom: 8 }}>{t.payStatus}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
        {PAY_KEYS.map((p) => <Chip key={p} label={t[`pay_${p}`]} color={PAY_COLORS[p]} active={f.pay === p} onPress={() => set('pay')(p)} />)}
      </View>

      {!!err && <Txt w="m" size={13} color={RED} style={{ marginTop: 14, textAlign: 'center' }}>{err}</Txt>}

      <Button title={editing ? t.save : t.createOrder} icon={editing ? 'checkmark' : 'sparkles-outline'} onPress={save} loading={saving} style={{ marginTop: 22 }} />
      <Button title={t.cancel} variant="ghost" onPress={onClose} style={{ marginTop: 10 }} small />
    </BottomSheet>
  );
}
