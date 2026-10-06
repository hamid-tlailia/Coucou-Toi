import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePrefs } from '../context/Prefs';
import { Txt, Button } from './ui';
import { sendStockNotice } from '../lib/stockNotice';
import { RED, srcOf } from '../theme';

/**
 * Red banner shown on an order / AI draft that contains perfumes sold out on
 * the website, with one-tap "tell the customer" actions.
 */
export default function StockAlert({ order, compact }) {
  const { t, showToast } = usePrefs();
  const [busy, setBusy] = useState('');
  if (!order?.outOfStock?.length) return null;

  const social = ['instagram', 'facebook', 'tiktok'].includes(order.source) ? order.source : null;
  const send = (via) => async () => {
    setBusy(via);
    try {
      const r = await sendStockNotice(order, t, via);
      if (r === 'copied') showToast(t.msgCopied, 'info');
    } catch {
      showToast(t.error, 'error');
    } finally { setBusy(''); }
  };

  return (
    <View style={{ backgroundColor: 'rgba(224,101,91,0.1)', borderColor: 'rgba(224,101,91,0.35)', borderWidth: 1, borderRadius: 16, padding: 12, marginTop: compact ? 10 : 16 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <Ionicons name="alert-circle" size={20} color={RED} />
        <View style={{ flex: 1 }}>
          <Txt w="b" size={13.5} color={RED}>{t.outOfStockTitle}</Txt>
          <Txt w="m" size={12.5} style={{ marginTop: 3, writingDirection: 'ltr', textAlign: 'left' }}>{order.outOfStock.join('\n')}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        {!!order.phone && (
          <Button small variant="dark" icon="logo-whatsapp" title={t.notifyWa} loading={busy === 'whatsapp'} onPress={send('whatsapp')} style={{ flex: 1 }} />
        )}
        {social && (
          <Button small variant="ghost" icon={srcOf(social).icon} title={t[`src_${social}`]} loading={busy === social} onPress={send(social)} style={{ flex: 1 }} />
        )}
      </View>
    </View>
  );
}
