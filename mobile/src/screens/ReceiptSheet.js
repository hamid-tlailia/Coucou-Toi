import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import BottomSheet from '../components/BottomSheet';
import QR from '../lib/QR';
import { shareReceiptPdf } from '../lib/receiptPdf';
import { formatTND } from '../lib/money';
import { PrimaryButton, GhostButton } from '../components/ui';
import { GOLD, GREEN, RED } from '../theme';

export default function ReceiptSheet({ order, onClose, t, th, storeName }) {
  const [sharing, setSharing] = useState(false);
  if (!order) return null;

  const deepLink = `cocolove://order?id=${order.id}&code=${order.code}`;

  const rows = [
    [t.customer, order.customer],
    [t.phone, order.phone],
    [t.address, order.city],
    [t.products, order.items],
    [t.source, t[`src_${order.source}`]],
    [t.payStatus, t[`pay_${order.pay}`]],
  ];

  const share = async () => {
    setSharing(true);
    try { await shareReceiptPdf({ order, store: storeName, t, deepLink }); }
    catch { Alert.alert(t.error); }
    finally { setSharing(false); }
  };

  const sendWa = () => {
    const msg = `${order.customer}\n${t.orderNo}: #${order.id}\n${order.items}\n${t.amount}: ${formatTND(order.total)}\n${t.trackingCode}: ${order.code}`;
    Linking.openURL(`https://wa.me/${order.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`);
    onClose();
  };

  return (
    <BottomSheet visible={!!order} onClose={onClose} th={th}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 20 }}>✨</Text>
        </View>
        <Text style={{ fontSize: 17, fontWeight: '700', color: th.text }}>{storeName}</Text>
        <Text style={{ fontSize: 12, color: th.muted, marginTop: 3 }}>{t.receipt} — #{order.id} · {order.date}</Text>
      </View>

      <View style={{ borderTopWidth: 1.5, borderTopColor: th.border, borderStyle: 'dashed', marginVertical: 14 }} />

      {rows.map(([l, v], i) => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: th.muted, fontSize: 13 }}>{l}</Text>
          <Text style={{ color: i === 5 ? (order.pay === 'paid' ? GREEN : RED) : th.text, fontWeight: '600', fontSize: 13 }}>{v}</Text>
        </View>
      ))}

      <View style={{ borderTopWidth: 1.5, borderTopColor: th.border, borderStyle: 'dashed', marginVertical: 14 }} />
      <Text style={{ fontSize: 21, fontWeight: '700', color: th.text, textAlign: 'center' }}>{formatTND(order.total)}</Text>

      <View style={{ alignItems: 'center', marginTop: 15 }}>
        <View style={{ padding: 10, borderRadius: 16, backgroundColor: '#FFF', shadowColor: GOLD, shadowOpacity: 0.4, shadowRadius: 8 }}>
          <QR value={deepLink} size={148} />
        </View>
      </View>
      <Text style={{ textAlign: 'center', fontSize: 12, color: th.muted, marginTop: 10, letterSpacing: 1.5 }}>{order.code}</Text>

      <PrimaryButton th={th} title={`🧾 ${t.printPdf}`} onPress={share} loading={sharing} style={{ marginTop: 16 }} />
      <TouchableOpacity onPress={sendWa} style={{ backgroundColor: '#25D366', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 9 }}>
        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13.5 }}>💬 {t.sendWa}</Text>
      </TouchableOpacity>
      <GhostButton th={th} title={t.close} onPress={onClose} style={{ backgroundColor: 'transparent', marginTop: 9 }} color={th.muted} />
    </BottomSheet>
  );
}
