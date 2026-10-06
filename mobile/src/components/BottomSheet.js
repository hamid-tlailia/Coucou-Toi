import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Pressable, Animated, StyleSheet, Dimensions, ScrollView, PanResponder, Keyboard, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrefs } from '../context/Prefs';
import { Txt } from './ui';

const { height: SCREEN_H } = Dimensions.get('window');
const CLOSE_DISTANCE = 120;

/**
 * Modern bottom sheet:
 * - springs up / slides down, backdrop fades
 * - drag down to dismiss: from the handle area, or from anywhere in the sheet
 *   when its content is scrolled to the top (like iOS / Material sheets)
 * - lifts above the keyboard and shrinks to the space left, so the focused
 *   field is never hidden (works whether or not Android resizes the window)
 */
export default function BottomSheet({ visible, onClose, title, children, scroll = true }) {
  const { th } = usePrefs();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [rootH, setRootH] = useState(SCREEN_H);
  const [kbTop, setKbTop] = useState(null); // keyboard's top edge (screen Y), null when hidden
  const y = useRef(new Animated.Value(SCREEN_H)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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
      if (mounted) animateIn(); // re-opened before the close animation finished
      else setMounted(true);
    } else if (mounted) {
      Keyboard.dismiss();
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(y, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, (e) => setKbTop(e.endCoordinates.screenY));
    const h = Keyboard.addListener(hideEvt, () => setKbTop(null));
    return () => { s.remove(); h.remove(); };
  }, []);

  const release = (_, g) => {
    if (g.dy > CLOSE_DISTANCE || g.vy > 1.1) onCloseRef.current?.();
    else Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 220 }).start();
  };
  const move = (_, g) => y.setValue(Math.max(0, g.dy));
  const isDownSwipe = (g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.4;

  // Handle area: always draggable.
  const handlePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => isDownSwipe(g),
    onPanResponderMove: move,
    onPanResponderRelease: release,
    onPanResponderTerminationRequest: () => false,
  })).current;

  // Whole sheet: takes over a downward swipe only when the content is at the top.
  const sheetPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => scrollY.current <= 0 && isDownSwipe(g),
    onPanResponderMove: move,
    onPanResponderRelease: release,
    onPanResponderTerminate: release,
  })).current;

  if (!mounted) return null;
  const Body = scroll ? ScrollView : View;

  // How much of our window the keyboard covers (0 if Android already resized it).
  const overlap = kbTop == null ? 0 : Math.max(0, rootH - kbTop);
  // Keep clear of the status bar (inside a Modal the inset can read as 0).
  const topGap = Math.max(insets.top, StatusBar.currentHeight || 0, 24) + 16;
  const maxH = Math.max(220, rootH - overlap - topGap);

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} onShow={animateIn} statusBarTranslucent>
      <View style={{ flex: 1 }} onLayout={(e) => setRootH(e.nativeEvent.layout.height)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: th.overlay, opacity: fade }]} />
        </Pressable>
        <Animated.View
          {...sheetPan.panHandlers}
          style={[styles.sheet, {
            bottom: overlap, maxHeight: maxH,
            backgroundColor: th.bg, borderColor: th.border,
            paddingBottom: overlap ? 12 : insets.bottom + 16,
            transform: [{ translateY: y }],
          }]}
        >
          <View {...handlePan.panHandlers} style={styles.handleArea}>
            <View style={[styles.grab, { backgroundColor: th.faint }]} />
            {!!title && <Txt w="x" size={19} style={{ textAlign: 'center', marginTop: 12 }}>{title}</Txt>}
          </View>
          <Body
            {...(scroll ? {
              showsVerticalScrollIndicator: false,
              keyboardShouldPersistTaps: 'handled',
              contentContainerStyle: { paddingBottom: 6 },
              scrollEventThrottle: 16,
              onScroll: (e) => { scrollY.current = e.nativeEvent.contentOffset.y; },
            } : {})}
            style={{ paddingHorizontal: 20 }}
          >
            {children}
          </Body>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0,
    borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderBottomWidth: 0,
  },
  handleArea: { paddingTop: 12, paddingBottom: 10, minHeight: 34 },
  grab: { width: 46, height: 5, borderRadius: 4, alignSelf: 'center', opacity: 0.7 },
});
