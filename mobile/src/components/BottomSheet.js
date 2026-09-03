import React, { useEffect, useRef } from 'react';
import { Modal, View, TouchableWithoutFeedback, Animated, StyleSheet, Dimensions, ScrollView } from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');

/**
 * A real bottom sheet: flush to the screen edge (no gap under it), slides
 * up from y=100% to y=0, backdrop fades in parallel.
 */
export default function BottomSheet({ visible, onClose, th, children }) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }),
      ]).start();
    } else {
      translateY.setValue(SCREEN_H);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,12,22,0.55)', opacity: backdrop }]} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: th.bg, transform: [{ translateY }] },
          ]}
        >
          <View style={[styles.grab, { backgroundColor: th.border }]} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '92%',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28,
  },
  grab: { width: 40, height: 4, borderRadius: 4, alignSelf: 'center', marginBottom: 14 },
});
