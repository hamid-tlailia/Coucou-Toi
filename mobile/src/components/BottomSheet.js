import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Pressable, Animated, StyleSheet, Dimensions, ScrollView, KeyboardAvoidingView, Platform, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrefs } from '../context/Prefs';
import { Txt } from './ui';

const { height: SCREEN_H } = Dimensions.get('window');

/**
 * Bottom sheet: springs up, fades the backdrop, animates out on close and
 * can be dragged down by its handle to dismiss.
 */
export default function BottomSheet({ visible, onClose, title, children, scroll = true }) {
  const { th } = usePrefs();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const y = useRef(new Animated.Value(SCREEN_H)).current;
  const fade = useRef(new Animated.Value(0)).current;

  // The entrance animation starts from Modal's onShow, i.e. once the sheet's
  // views exist natively — starting it earlier could leave it off-screen.
  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 240, mass: 0.9 }),
    ]).start();
  };

  useEffect(() => {
    if (visible) {
      y.setValue(SCREEN_H);
      fade.setValue(0);
      if (mounted) animateIn(); // already on screen (re-opened before close finished)
      else setMounted(true);
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(y, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6,
    onPanResponderMove: (_, g) => { if (g.dy > 0) y.setValue(g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 110 || g.vy > 1.2) onCloseRef.current?.();
      else Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 20 }).start();
    },
  })).current;
  if (!mounted) return null;
  const Body = scroll ? ScrollView : View;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} onShow={animateIn} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: th.overlay, opacity: fade }]} />
        </Pressable>
        <Animated.View style={[styles.sheet, { backgroundColor: th.bg, borderColor: th.border, paddingBottom: insets.bottom + 16, transform: [{ translateY: y }] }]}>
          <View {...pan.panHandlers} style={{ paddingTop: 10, paddingBottom: 6 }}>
            <View style={[styles.grab, { backgroundColor: th.faint }]} />
            {!!title && <Txt w="x" size={19} style={{ textAlign: 'center', marginTop: 12 }}>{title}</Txt>}
          </View>
          <Body
            {...(scroll ? { showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled', contentContainerStyle: { paddingBottom: 6 } } : {})}
            style={{ paddingHorizontal: 20 }}
          >
            {children}
          </Body>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '93%',
    borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderBottomWidth: 0,
  },
  grab: { width: 42, height: 5, borderRadius: 4, alignSelf: 'center', opacity: 0.6 },
});
