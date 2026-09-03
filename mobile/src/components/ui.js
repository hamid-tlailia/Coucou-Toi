import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { DEEP, PLUM, GOLD, shadow } from '../theme';

export function Chip({ label, active, onPress, gradientColor = PLUM, th }) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? gradientColor : th.surface, borderColor: th.border },
        active && shadow(3),
      ]}
    >
      <Text style={{ color: active ? '#FFF' : th.muted, fontWeight: active ? '700' : '500', fontSize: 12.5 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function PrimaryButton({ title, onPress, disabled, th, style, loading }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.primaryBtn, { opacity: disabled ? 0.5 : 1 }, shadow(5), style]}
    >
      <Text style={styles.primaryBtnText}>{loading ? '…' : title}</Text>
    </TouchableOpacity>
  );
}

export function GhostButton({ title, onPress, th, style, color }) {
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={[styles.ghostBtn, { backgroundColor: th.raised }, style]}>
      <Text style={{ color: color || th.text, fontWeight: '600', fontSize: 13.5 }}>{title}</Text>
    </TouchableOpacity>
  );
}

export function FieldLabel({ children, th }) {
  return <Text style={[styles.label, { color: th.text }]}>{children}</Text>;
}

export function Input({ th, style, ...props }) {
  return (
    <TextInput
      placeholderTextColor={th.muted}
      style={[styles.input, { borderColor: th.border, backgroundColor: th.surface, color: th.text }, style]}
      {...props}
    />
  );
}

export function Card({ children, th, style }) {
  return <View style={[styles.card, { backgroundColor: th.surface }, shadow(4), style]}>{children}</View>;
}

export function StatCard({ label, value, accent, th }) {
  return (
    <View style={[styles.statCard, { backgroundColor: th.surface, borderTopColor: accent }, shadow(3)]}>
      <Text style={[styles.statValue, { color: th.text }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={[styles.statLabel, { color: th.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, marginInlineEnd: 8 },
  primaryBtn: { backgroundColor: DEEP, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13.5 },
  ghostBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  label: { fontSize: 12.5, fontWeight: '700', marginTop: 14, marginBottom: 6, textAlign: 'left' },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  card: { borderRadius: 18, padding: 16 },
  statCard: { flex: 1, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 6, alignItems: 'center', borderTopWidth: 3 },
  statValue: { fontSize: 15, fontWeight: '700' },
  statLabel: { fontSize: 10, marginTop: 5, textAlign: 'center' },
});
