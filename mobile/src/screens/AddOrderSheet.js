import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import BottomSheet from '../components/BottomSheet';
import { usePrefs } from '../context/Prefs';
import { Txt, Input, Chip, Button, haptic } from '../components/ui';
import { SOURCES, PAY_KEYS, PAY_COLORS, RED } from '../theme';
import { createOrder, updateOrder } from '../api/orders';
import ProductPicker, { cartText, cartTotal, parseCart } from '../components/ProductPicker';
import { getCatalog } from '../api/catalog';

const EMPTY = { customer: '', phone: '', city: '', items: '', total: '', source: 'manual', pay: 'cod' };

/** Create a new order, or edit an existing one when `editing` is passed. */
export default function AddOrderSheet({ visible, editing, onClose, onSaved }) {
  const { t, th, showToast } = usePrefs();
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [cart, setCart] = useState([]);
  const [extra, setExtra] = useState([]); // free-text product lines not in the catalog

  useEffect(() => {
    if (!visible) return;
    setErr('');
    setCart([]);
    setExtra([]);
    if (editing) {
      getCatalog().then((cat) => {
        const parsed = parseCart(editing.items, cat);
        setCart(parsed.cart);
        setExtra(parsed.extra);
      }).catch(() => {});
    }
    setF(editing
      ? { customer: editing.customer, phone: editing.phone, city: editing.city || '', items: editing.items || '', total: String(editing.total), source: editing.source, pay: editing.pay }
      : EMPTY);
  }, [visible, editing]);

  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  // Picking perfumes fills in the products text and the total automatically.
  const onCart = (next) => {
    setCart(next);
    setF((s) => ({ ...s, items: [cartText(next), ...extra].filter(Boolean).join('\n'), total: next.length ? String(cartTotal(next)) : s.total }));
  };

  const save = async () => {
    const total = parseFloat(String(f.total).replace(',', '.'));
    if (!f.customer.trim() || f.phone.trim().length < 4 || Number.isNaN(total)) { haptic('error'); return setErr(t.required); }
    setSaving(true);
    const body = { customer: f.customer.trim(), phone: f.phone.trim(), city: f.city.trim(), items: f.items.trim(), total, pay: f.pay };
    try {
      const order = editing ? await updateOrder(editing.id, { ...body, source: f.source }) : await createOrder({ ...body, source: f.source });
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
      <Txt w="b" size={12.5} color={th.muted} style={{ marginTop: 12, marginBottom: 8 }}>{t.source}</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {SOURCES.map((s) => (
          <Chip key={s.key} label={t[`src_${s.key}`]} icon={s.icon} color={s.color} active={f.source === s.key} onPress={() => set('source')(s.key)} />
        ))}
      </ScrollView>

      <Input label={`${t.customer} *`} icon="person-outline" value={f.customer} onChangeText={set('customer')} />
      <Input label={`${t.phone} *`} icon="call-outline" keyboardType="phone-pad" placeholder="22 123 456" value={f.phone} onChangeText={set('phone')} />
      <Input label={t.city} icon="location-outline" value={f.city} onChangeText={set('city')} />
      <ProductPicker cart={cart} onChange={onCart} />
      {cart.some((l) => !l.available) && (
        <Txt w="b" size={12.5} color={RED} style={{ marginTop: 8 }}>⚠️ {t.cartUnavailable}</Txt>
      )}
      <Input label={t.products} icon="pricetags-outline" value={f.items} onChangeText={set('items')} multiline placeholder="COUCOU TOI 100 ML ×1" />
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
