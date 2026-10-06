import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePrefs } from '../context/Prefs';
import { Txt, Button } from './ui';
import { RED } from '../theme';

/** In-app confirmation dialog (replaces the system Alert). */
export default function ConfirmModal({ visible, title, message, confirmLabel, cancelLabel, danger, icon = 'help-circle-outline', onConfirm, onCancel }) {
  const { th } = usePrefs();
  const [shown, setShown] = useState(visible);
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) setShown(true);
    else if (shown) Animated.timing(v, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => setShown(false));
  }, [visible]);

  const animateIn = () => Animated.spring(v, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 260 }).start();
  if (!shown) return null;

  const color = danger ? RED : th.accent;
  return (
    <Modal visible transparent animationType="none" onShow={animateIn} onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: th.overlay, opacity: v }]} />
      </Pressable>
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View style={[styles.card, { backgroundColor: th.bg, borderColor: th.border, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}>
          <View style={[styles.icon, { backgroundColor: `${color}1F` }]}>
            <Ionicons name={icon} size={30} color={color} />
          </View>
          <Txt w="x" size={18} style={{ textAlign: 'center', marginTop: 12 }}>{title}</Txt>
          {!!message && <Txt size={14} color={th.muted} style={{ textAlign: 'center', marginTop: 6, lineHeight: 22 }}>{message}</Txt>}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' }}>
            <Button small variant="ghost" title={cancelLabel} onPress={onCancel} style={{ flex: 1 }} />
            <Button small variant={danger ? 'danger' : 'gold'} title={confirmLabel} onPress={onConfirm} style={{ flex: 1 }} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 380, borderRadius: 26, padding: 22, borderWidth: 1, alignItems: 'center' },
  icon: { width: 60, height: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
