import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePrefs } from '../context/Prefs';
import { Txt, Card } from './ui';
import { getChannels } from '../api/account';
import { SOURCES, GREEN } from '../theme';

/** Settings: messaging channels connected to the server (messages arrive in the assistant on their own). */
export default function ChannelsCard() {
  const { t, th } = usePrefs();
  const [status, setStatus] = useState(null);
  useEffect(() => { getChannels().then(setStatus).catch(() => {}); }, []);
  if (!status) return null;

  return (
    <Card style={{ marginTop: 14 }}>
      <Txt w="b" size={16}>{t.channelsTitle}</Txt>
      <Txt size={12.5} color={th.muted} style={{ marginTop: 4, lineHeight: 20 }}>{t.channelsHint}</Txt>
      {['whatsapp', 'instagram', 'facebook'].map((key, i) => {
        const src = SOURCES.find((s) => s.key === key);
        const on = !!status[key];
        return (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderColor: th.border, marginTop: i ? 0 : 8 }}>
            <Ionicons name={src?.icon || 'chatbubble-outline'} size={20} color={src?.color || th.accent} />
            <Txt w="m" size={14.5} style={{ flex: 1 }}>{t[`src_${key}`]}</Txt>
            <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={on ? GREEN : th.faint} />
            <Txt size={12.5} color={on ? GREEN : th.muted}>{on ? t.channelOn : t.channelOff}</Txt>
          </View>
        );
      })}
    </Card>
  );
}
