import React, { useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet from '../components/BottomSheet';
import { usePrefs } from '../context/Prefs';
import { useAuth } from '../auth/AuthContext';
import { Txt, Button } from '../components/ui';
import QR from '../lib/QR';
import { formatTND } from '../lib/money';
import { shareInvoicePdf, printInvoice } from '../lib/invoice';
import { sendWhatsApp, ltr } from '../lib/orderActions';
import { shortNo } from '../api/orders';
import { trackingUrl } from '../config';
import { PAY_COLORS, GOLD_GRAD } from '../theme';

/** On-screen invoice preview + PDF share / print / WhatsApp. */
export default function InvoiceSheet({ order, onClose }) {
  const { t, showToast } = usePrefs();
  const { user } = useAuth();
  const [busy, setBusy] = useState('');
  if (!order) return <BottomSheet visible={false} onClose={onClose} />;

  const run = (key, fn) => async () => {
    setBusy(key);
    try { await fn(); } catch { showToast(t.error, 'error'); } finally { setBusy(''); }
  };
  const args = { order, user, t };

  return (
    <BottomSheet visible={!!order} onClose={onClose}>
      {/* Paper preview — always light, like the real document */}
      <View style={{ backgroundColor: '#FFFDF9', borderRadius: 22, overflow: 'hidden', marginTop: 6 }}>
        <LinearGradient colors={GOLD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 6 }} />
        <View style={{ padding: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <Txt w="x" size={20} color="#2A1830">{user.store || user.name}</Txt>
              {!!user.storePhone && <Txt size={11.5} color="#8A7A84">{ltr(user.storePhone)}</Txt>}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt w="b" size={10.5} color="#A87D3E">{t.invoiceNo}</Txt>
              <Txt w="x" size={17} color="#1C1418">{ltr(shortNo(order))}</Txt>
            </View>
          </View>

          <View style={{ backgroundColor: '#FAF6F0', borderRadius: 14, padding: 12, marginTop: 14, borderWidth: 1, borderColor: '#EFE5D6' }}>
            <Txt w="b" size={10.5} color="#A87D3E">{t.billTo}</Txt>
            <Txt w="b" size={15} color="#1C1418" style={{ marginTop: 2 }}>{order.customer}</Txt>
            <Txt size={12} color="#6E6170">{[ltr(order.phone), order.city].filter(Boolean).join(' · ')}</Txt>
          </View>

          {!!order.items && <Txt w="m" size={13.5} color="#1C1418" style={{ marginTop: 12, lineHeight: 22 }}>{order.items}</Txt>}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
            <View>
              <LinearGradient colors={['#2A1830', '#4A2A4F']} style={{ borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16 }}>
                <Txt w="b" size={10.5} color="#F0D49A">{t.total}</Txt>
                <Txt w="x" size={21} color="#FFF">{formatTND(order.total)}</Txt>
              </LinearGradient>
              <View style={{ alignSelf: 'flex-start', marginTop: 10, borderWidth: 2, borderColor: PAY_COLORS[order.pay], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, transform: [{ rotate: '-4deg' }] }}>
                <Txt w="x" size={12} color={PAY_COLORS[order.pay]}>{t[`pay_${order.pay}`]}</Txt>
              </View>
            </View>
            <View style={{ alignItems: 'center' }}>
              <QR value={trackingUrl(order.code)} size={104} dark="#1C1418" light="#FFFDF9" />
              <Txt size={9.5} color="#8A7A84">{t.scanToTrack}</Txt>
            </View>
          </View>
        </View>
      </View>

      <Button title={t.sharePdf} icon="share-outline" onPress={run('pdf', () => shareInvoicePdf(args))} loading={busy === 'pdf'} style={{ marginTop: 18 }} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <Button title={t.sendWa} icon="logo-whatsapp" variant="dark" onPress={() => sendWhatsApp(order, t)} style={{ flex: 1 }} small />
        <Button title={t.print} icon="print-outline" variant="ghost" onPress={run('print', () => printInvoice(args))} loading={busy === 'print'} style={{ flex: 1 }} small />
      </View>
      <Button title={t.close} variant="ghost" onPress={onClose} style={{ marginTop: 10, opacity: 0.8 }} small />
    </BottomSheet>
  );
}
