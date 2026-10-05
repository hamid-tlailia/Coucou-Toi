import React, { useRef, useEffect, memo } from 'react';
import { View, Text, TextInput, Pressable, Animated, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { usePrefs } from '../context/Prefs';
import { FONT, GOLD_GRAD, RED, shadow } from '../theme';

export const haptic = (kind = 'light') => {
  const map = { light: Haptics.ImpactFeedbackStyle.Light, medium: Haptics.ImpactFeedbackStyle.Medium };
  if (kind === 'success') return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  if (kind === 'error') return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  return Haptics.impactAsync(map[kind] || map.light).catch(() => {});
};

/** Text in the brand font. `w`: r | m | b | x (regular → extra-bold). */
export function Txt({ w = 'r', size = 14, color, style, children, ...p }) {
  const { th } = usePrefs();
  return (
    <Text {...p} style={[{ fontFamily: FONT[w], fontSize: size, color: color || th.text }, style]}>
      {children}
    </Text>
  );
}

/**
 * Pressable that gently scales down on touch — the "native-feeling" press.
 * The animated view owns the layout (so flex/width behave exactly like a
 * View) and a transparent Pressable layered on top captures the touch.
 */
export function Press({ onPress, style, children, disabled, scale = 0.97, hapticKind = 'light', ...p }) {
  const v = useRef(new Animated.Value(1)).current;
  const to = (x) => Animated.spring(v, { toValue: x, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Animated.View style={[style, { transform: [{ scale: v }] }, disabled && { opacity: 0.5 }]}>
      {children}
      <Pressable
        {...p}
        style={StyleSheet.absoluteFill}
        disabled={disabled || !onPress}
        onPressIn={() => to(scale)}
        onPressOut={() => to(1)}
        onPress={(e) => { if (hapticKind) haptic(hapticKind); onPress?.(e); }}
      />
    </Animated.View>
  );
}

/** Buttons. variant: gold | dark | ghost | danger | outline */
export function Button({ title, onPress, variant = 'gold', icon, loading, disabled, style, small }) {
  const { th } = usePrefs();
  const pad = small ? { paddingVertical: 10, paddingHorizontal: 14 } : { paddingVertical: 15, paddingHorizontal: 18 };
  const fg = {
    gold: th.onAccent, dark: '#F6F0E8', ghost: th.text, danger: RED, outline: th.accent,
  }[variant];
  const content = (
    <View style={[styles.btnInner, pad]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 18} color={fg} />}
          <Txt w="b" size={small ? 13 : 15} color={fg}>{title}</Txt>
        </>
      )}
    </View>
  );
  const bg = {
    dark: { backgroundColor: '#2A1830' },
    ghost: { backgroundColor: th.raised },
    danger: { backgroundColor: 'rgba(224,101,91,0.12)' },
    outline: { borderWidth: 1.2, borderColor: th.accent },
  }[variant];
  return (
    <Press onPress={onPress} disabled={disabled || loading} style={[styles.btn, variant === 'gold' && shadow(6, '#A87D3E'), style]}>
      {variant === 'gold' ? (
        <LinearGradient colors={GOLD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGrad}>{content}</LinearGradient>
      ) : (
        <View style={[styles.btnGrad, bg]}>{content}</View>
      )}
    </Press>
  );
}

export function IconBtn({ icon, onPress, badge, size = 42, color, style }) {
  const { th } = usePrefs();
  return (
    <Press onPress={onPress} style={[{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: th.raised, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: th.border }, style]}>
      <Ionicons name={icon} size={size * 0.47} color={color || th.text} />
      {!!badge && (
        <View style={styles.badge}>
          <Txt w="b" size={10} color="#FFF">{badge > 9 ? '9+' : badge}</Txt>
        </View>
      )}
    </Press>
  );
}

export function Card({ children, style, padded = true }) {
  const { th } = usePrefs();
  return (
    <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }, padded && { padding: 18 }, th.mode === 'light' && shadow(3, '#5A3A4A'), style]}>
      {children}
    </View>
  );
}

export function SectionTitle({ title, right, style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, style]}>
      <Txt w="b" size={16.5}>{title}</Txt>
      {right}
    </View>
  );
}

export function Chip({ label, active, onPress, color, icon }) {
  const { th } = usePrefs();
  const c = color || th.accent;
  return (
    <Press onPress={onPress} scale={0.94} style={[styles.chip, { backgroundColor: active ? c : th.surface, borderColor: active ? c : th.border }]}>
      {icon && <Ionicons name={icon} size={14} color={active ? '#FFF' : th.muted} />}
      <Txt w={active ? 'b' : 'm'} size={13} color={active ? (c === th.accent && th.mode === 'dark' ? th.onAccent : '#FFF') : th.muted}>{label}</Txt>
    </Press>
  );
}

export function Tag({ label, color, icon, solid }) {
  return (
    <View style={[styles.tag, { backgroundColor: solid ? color : `${color}22` }]}>
      {icon && <Ionicons name={icon} size={11} color={solid ? '#FFF' : color} />}
      <Txt w="b" size={11} color={solid ? '#FFF' : color}>{label}</Txt>
    </View>
  );
}

export const Input = memo(function Input({ label, icon, style, inputStyle, multiline, ...p }) {
  const { th } = usePrefs();
  return (
    <View style={style}>
      {!!label && <Txt w="b" size={12.5} color={th.muted} style={{ marginBottom: 7, marginTop: 14 }}>{label}</Txt>}
      <View style={[styles.input, { backgroundColor: th.raised, borderColor: th.border }, multiline && { alignItems: 'flex-start' }]}>
        {icon && <Ionicons name={icon} size={18} color={th.muted} style={multiline && { marginTop: 13 }} />}
        <TextInput
          placeholderTextColor={th.faint}
          selectionColor={th.accent}
          multiline={multiline}
          {...p}
          style={[{ flex: 1, color: th.text, fontFamily: FONT.m, fontSize: 15, paddingVertical: 13 }, multiline && { minHeight: 110, textAlignVertical: 'top' }, inputStyle]}
        />
      </View>
    </View>
  );
});

export function Skeleton({ h = 16, w = '100%', r = 10, style }) {
  const { th } = usePrefs();
  const o = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(o, { toValue: 0.4, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={[{ height: h, width: w, borderRadius: r, backgroundColor: th.raised, opacity: o }, style]} />;
}

export function Empty({ icon, title, sub, action }) {
  const { th } = usePrefs();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 50, paddingHorizontal: 30 }}>
      <View style={{ width: 84, height: 84, borderRadius: 30, backgroundColor: th.raised, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: th.border }}>
        <Ionicons name={icon} size={36} color={th.accent} />
      </View>
      <Txt w="b" size={17} style={{ textAlign: 'center' }}>{title}</Txt>
      {!!sub && <Txt size={13.5} color={th.muted} style={{ textAlign: 'center', marginTop: 6, lineHeight: 21 }}>{sub}</Txt>}
      {action}
    </View>
  );
}

/** Fades + slides children in on mount — used to stagger dashboard cards. */
export function FadeIn({ delay = 0, children, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 380, delay, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

export function Divider({ dashed, style }) {
  const { th } = usePrefs();
  return <View style={[{ borderTopWidth: 1, borderColor: th.border, borderStyle: dashed ? 'dashed' : 'solid', marginVertical: 14 }, style]} />;
}

const styles = StyleSheet.create({
  btn: { borderRadius: 16 },
  btnGrad: { borderRadius: 16, overflow: 'hidden' },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  card: { borderRadius: 24, borderWidth: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 22, borderWidth: 1, marginEnd: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
});
