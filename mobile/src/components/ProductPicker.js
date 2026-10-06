import React, { useEffect, useState, memo } from 'react';
import { View, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePrefs } from '../context/Prefs';
import { Txt, Press, Skeleton } from './ui';
import { getCatalog } from '../api/catalog';
import { formatTND } from '../lib/money';
import { GOLD } from '../theme';

/** Cart → the order's "products" text and total. */
export const cartText = (cart) => cart.map((l) => `${l.name} ×${l.qty}`).join('\n');
export const cartTotal = (cart) => cart.reduce((s, l) => s + l.price * l.qty, 0);

/**
 * Reads an order's products text back into a cart (lines like "NAME ×2").
 * Lines that don't match a catalog product are returned as `extra` so they
 * are kept when the text is regenerated.
 */
export function parseCart(itemsText, catalog) {
  const cart = [];
  const extra = [];
  for (const raw of String(itemsText || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(.*?)\s*[×xX]\s*(\d+)$/);
    const name = (m ? m[1] : line).trim().toUpperCase();
    const p = catalog.find((c) => c.name === name);
    if (p) cart.push({ id: p.id, name: p.name, price: p.price, qty: m ? Number(m[2]) : 1, available: p.available });
    else extra.push(line);
  }
  return { cart, extra };
}

/**
 * Perfume picker for the order form: tap a product to add it, adjust the
 * quantity, and the parent fills in the products text and total from it.
 * Products and prices come live from the store's website.
 */
export default function ProductPicker({ cart, onChange }) {
  const { t, th } = usePrefs();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    getCatalog().then(setProducts).catch(() => setProducts([]));
  }, []);

  const add = (p) => {
    const i = cart.findIndex((l) => l.id === p.id);
    if (i >= 0) onChange(cart.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l)));
    else onChange([...cart, { id: p.id, name: p.name, price: p.price, qty: 1, available: p.available }]);
  };
  const setQty = (id, qty) => onChange(qty <= 0 ? cart.filter((l) => l.id !== id) : cart.map((l) => (l.id === id ? { ...l, qty } : l)));

  if (products && products.length === 0) return null; // catalog unavailable → free text only

  return (
    <View>
      <Txt w="b" size={12.5} color={th.muted} style={{ marginTop: 14, marginBottom: 8 }}>{t.pickProducts}</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 2 }}>
        {products === null
          ? [0, 1, 2].map((i) => <Skeleton key={i} w={118} h={168} r={18} />)
          : products.map((p) => (
            <ProductCard key={p.id} p={p} count={cart.find((l) => l.id === p.id)?.qty || 0} onPress={() => add(p)} />
          ))}
      </ScrollView>

      {cart.length > 0 && (
        <View style={{ marginTop: 12, backgroundColor: th.surface, borderRadius: 18, borderWidth: 1, borderColor: th.border, paddingHorizontal: 14 }}>
          {cart.map((l, i) => (
            <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderColor: th.border }}>
              <View style={{ flex: 1 }}>
                <Txt w="b" size={13} numberOfLines={2}>{l.name}</Txt>
                <Txt size={12} color={th.accent} style={{ marginTop: 2 }}>{formatTND(l.price * l.qty)}</Txt>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: th.raised, borderRadius: 14, padding: 4 }}>
                <QtyBtn icon={l.qty === 1 ? 'trash-outline' : 'remove'} onPress={() => setQty(l.id, l.qty - 1)} />
                <Txt w="x" size={15} style={{ minWidth: 20, textAlign: 'center' }}>{l.qty}</Txt>
                <QtyBtn icon="add" onPress={() => setQty(l.id, l.qty + 1)} />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const ProductCard = memo(function ProductCard({ p, count, onPress }) {
  const { t, th } = usePrefs();
  return (
    <Press onPress={onPress} scale={0.95}
      style={{ width: 118, borderRadius: 18, padding: 8, backgroundColor: th.surface, borderWidth: count ? 2 : 1, borderColor: count ? GOLD : th.border }}>
      <View style={{ width: '100%', aspectRatio: 1, borderRadius: 13, overflow: 'hidden', backgroundColor: th.raised }}>
        {p.image
          ? <Image source={{ uri: `${p.image}${p.image.includes('?') ? '&' : '?'}width=240` }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          : <Ionicons name="flask-outline" size={34} color={th.accent} style={{ alignSelf: 'center', marginTop: 30 }} />}
        {!!count && (
          <View style={{ position: 'absolute', top: 6, right: 6, minWidth: 24, height: 24, borderRadius: 12, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
            <Txt w="x" size={12} color="#1A1214">{count}</Txt>
          </View>
        )}
      </View>
      <Txt w="b" size={11.5} numberOfLines={2} style={{ marginTop: 7, height: 34, lineHeight: 17, writingDirection: 'ltr', textAlign: 'left' }}>{p.name}</Txt>
      <Txt w="x" size={13} color={th.accent} style={{ marginTop: 2 }}>{formatTND(p.price).replace('.000', '')}</Txt>
      {!p.available && <Txt size={10} color={th.faint} style={{ marginTop: 1 }}>{t.notOnSite}</Txt>}
    </Press>
  );
});

function QtyBtn({ icon, onPress }) {
  const { th } = usePrefs();
  return (
    <Press onPress={onPress} scale={0.85} style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: th.surface, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={17} color={th.text} />
    </Press>
  );
}

