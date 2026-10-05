import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../components/BottomSheet';
import { usePrefs } from '../context/Prefs';
import { Txt, Press, Empty, Button } from '../components/ui';
import { timeAgo } from '../lib/orderActions';
import { GOLD, GREEN, BLUE, PLUM } from '../theme';

const ICON = {
  new_draft: ['sparkles', GOLD],
  tracking_viewed: ['eye', BLUE],
  order_paid: ['cash', GREEN],
  order_delivered: ['checkmark-done', GREEN],
  order_created: ['bag-handle', PLUM],
};

export default function NotificationsSheet({ visible, items, onClose, onMarkAll, onTap }) {
  const { t, th } = usePrefs();
  const hasUnread = items.some((n) => !n.read);
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t.notifications}>
      {hasUnread && <Button small variant="outline" icon="checkmark-done" title={t.markAllRead} onPress={onMarkAll} style={{ marginTop: 12, marginBottom: 4 }} />}
      {items.length === 0 && <Empty icon="notifications-off-outline" title={t.noNotifications} />}
      {items.map((n) => {
        const [icon, color] = ICON[n.type] || ['notifications', GOLD];
        return (
          <Press key={n.id} onPress={() => onTap(n)} scale={0.98}
            style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderColor: th.border }}>
            <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={icon} size={20} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt w={n.read ? 'm' : 'b'} size={14} numberOfLines={1}>{n.title}</Txt>
              <Txt size={12.5} color={th.muted} numberOfLines={2} style={{ marginTop: 2 }}>{n.body}</Txt>
            </View>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Txt size={11} color={th.faint}>{timeAgo(n.createdAt, t)}</Txt>
              {!n.read && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: GOLD }} />}
            </View>
          </Press>
        );
      })}
    </BottomSheet>
  );
}
