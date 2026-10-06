import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { usePrefs } from '../context/Prefs';
import { Txt, Input, Button, Card, Tag, Press, haptic } from '../components/ui';
import { findByCode, updateOrder, shortNo } from '../api/orders';
import { formatTND } from '../lib/money';
import { ltr } from '../lib/orderActions';
import { GOLD, GREEN, GOLD_GRAD, STATUS_COLORS, PAY_COLORS } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

/** Pulls the order code out of whatever the QR contains. */
function codeFrom(data) {
  const s = String(data).trim();
  const track = s.match(/\/t\/([^/?#]+)/); // public tracking link on the invoice
  if (track) return decodeURIComponent(track[1]);
  const legacy = s.match(/code=([^&]+)/) || s.match(/id=([^&]+)/); // older receipts
  return legacy ? decodeURIComponent(legacy[1]) : s;
}

export default function ScanScreen({ onOpenOrder, onChanged }) {
  const { t, th, showToast } = usePrefs();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const lock = useRef(false);
  const line = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(line, { toValue: 1, duration: 1600, useNativeDriver: true }),
      Animated.timing(line, { toValue: 0, duration: 1600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const lookup = async (raw) => {
    if (!raw?.trim()) return;
    try {
      const order = await findByCode(codeFrom(raw));
      setResult(order);
      setError('');
      haptic('success');
    } catch {
      setResult(null);
      setError(t.notFound);
      haptic('error');
    }
  };

  const onScanned = ({ data }) => {
    if (lock.current || result) return;
    lock.current = true;
    lookup(data).finally(() => setTimeout(() => { lock.current = false; }, 1500));
  };

  const patch = async (p, key) => {
    setBusy(key);
    try {
      const updated = await updateOrder(result.id, p);
      setResult(updated);
      onChanged?.();
      showToast(key === 'pay' ? t.pay_paid : t.st_delivered);
    } catch { showToast(t.error, 'error'); } finally { setBusy(''); }
  };

  if (!permission) return <View style={{ flex: 1 }} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
      <Txt w="x" size={20} style={{ textAlign: 'center' }}>{t.scanTitle}</Txt>
      <Txt size={13} color={th.muted} style={{ textAlign: 'center', marginTop: 4, marginBottom: 14 }}>{t.scanHint}</Txt>

      <View style={[styles.cam, { borderColor: th.border, backgroundColor: '#000' }]}>
        {permission.granted ? (
          <>
            <CameraView style={StyleSheet.absoluteFill} barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128'] }}
              onBarcodeScanned={result ? undefined : onScanned} />
            <View pointerEvents="none" style={[styles.frameWrap, { direction: 'ltr' }]}>
              {[styles.tl, styles.tr, styles.bl, styles.br].map((s, i) => <View key={i} style={[styles.corner, s]} />)}
              <Animated.View style={[styles.line, { transform: [{ translateY: line.interpolate({ inputRange: [0, 1], outputRange: [0, 190] }) }] }]} />
            </View>
          </>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Ionicons name="camera-outline" size={40} color={GOLD} />
            <Txt color="#F6F0E8" style={{ textAlign: 'center', marginVertical: 12 }}>{t.cameraDenied}</Txt>
            <Button small title={t.allowCamera} icon="camera" onPress={requestPermission} />
          </View>
        )}
      </View>

      <Txt w="b" size={12.5} color={th.muted} style={{ marginTop: 18, marginBottom: 8 }}>{t.manualCode}</Txt>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Input icon="keypad-outline" placeholder="A1B2C3" autoCapitalize="characters" returnKeyType="search"
          value={manual} onChangeText={setManual} onSubmitEditing={() => lookup(manual)} style={{ flex: 1 }} />
        <Press onPress={() => lookup(manual)} style={styles.checkBtn}>
          <LinearGradient colors={GOLD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.checkInner}>
            <Ionicons name="search" size={22} color="#1A1214" />
          </LinearGradient>
        </Press>
      </View>

      {!!error && <Txt w="b" color="#E0655B" style={{ textAlign: 'center', marginTop: 14 }}>{error}</Txt>}

      {result && (
        <Card style={{ marginTop: 16 }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: `${PAY_COLORS[result.pay]}22` }}>
              <Ionicons name={result.pay === 'paid' ? 'checkmark-done' : 'time-outline'} size={32} color={PAY_COLORS[result.pay]} />
            </View>
            <Txt w="x" size={19} style={{ marginTop: 10 }}>{result.customer}</Txt>
            <Txt size={12.5} color={th.muted}>{ltr(shortNo(result))} · {result.city || ltr(result.phone)}</Txt>
            <Txt w="x" size={24} color={th.accent} style={{ marginTop: 6 }}>{formatTND(result.total)}</Txt>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
              <Tag label={t[`st_${result.status}`]} color={STATUS_COLORS[result.status]} />
              <Tag label={t[`pay_${result.pay}`]} color={PAY_COLORS[result.pay]} />
            </View>
          </View>
          {result.pay !== 'paid' && (
            <Button title={t.markPaid} icon="cash-outline" onPress={() => patch({ pay: 'paid' }, 'pay')} loading={busy === 'pay'} style={{ marginTop: 16 }} />
          )}
          {result.status !== 'delivered' && (
            <Button title={t.confirmDelivery} icon="checkmark-circle-outline" variant="dark" onPress={() => patch({ status: 'delivered' }, 'deliver')} loading={busy === 'deliver'} style={{ marginTop: 10 }} />
          )}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Button small variant="ghost" title={t.openOrder} icon="open-outline" onPress={() => onOpenOrder(result)} style={{ flex: 1 }} />
            <Button small variant="outline" title={t.scanAgain} icon="scan-outline" onPress={() => { setResult(null); setManual(''); }} style={{ flex: 1 }} />
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const C = 26;
const styles = StyleSheet.create({
  cam: { height: 260, borderRadius: 28, overflow: 'hidden', borderWidth: 1 },
  frameWrap: { position: 'absolute', top: 30, bottom: 30, left: 50, right: 50 },
  checkBtn: { width: 52, height: 52, borderRadius: 16 },
  checkInner: { flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: C, height: C, borderColor: GOLD },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  line: { position: 'absolute', left: 8, right: 8, top: 4, height: 2, backgroundColor: GREEN, opacity: 0.85, shadowColor: GREEN, shadowOpacity: 1, shadowRadius: 8 },
});
