import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions, scanFromURLAsync } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { usePrefs } from '../context/Prefs';
import { Txt, Input, Button, Card, Tag, Press, haptic } from '../components/ui';
import { findByCode, findByFile, updateOrder, shortNo } from '../api/orders';
import { formatTND } from '../lib/money';
import { ltr } from '../lib/orderActions';
import { GOLD, GREEN, GOLD_GRAD, STATUS_COLORS, PAY_COLORS } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

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
  const [reading, setReading] = useState(false);
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

  // Invoice from the phone (PDF or photo/screenshot): a photo's QR is read on
  // the device; otherwise the server reads the order number off the file.
  const uploadInvoice = async () => {
    const pick = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (pick.canceled || !pick.assets?.[0]) return;
    const file = pick.assets[0];
    const isPdf = /pdf/i.test(file.mimeType || '') || /\.pdf$/i.test(file.name || '');
    setReading(true);
    setError('');
    setResult(null);
    try {
      if (!isPdf) {
        const found = await scanFromURLAsync(file.uri, ['qr']).catch(() => []);
        if (found?.length) { await lookup(found[0].data); return; }
      }
      let data;
      let mimeType;
      if (isPdf) {
        if (file.size > 2_800_000) throw Object.assign(new Error(), { code: 'too_big' });
        data = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        mimeType = 'application/pdf';
      } else {
        const img = await ImageManipulator.manipulateAsync(file.uri, [{ resize: { width: 1400 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true });
        data = img.base64;
        mimeType = 'image/jpeg';
      }
      setResult(await findByFile(data, mimeType));
      haptic('success');
    } catch (e) {
      const msg = { too_big: t.fileTooBig, no_code: t.invoiceNoCode, ai_busy: t.aiBusy, ai_no_key: t.aiNoKey, network: t.offline }[e.code];
      setError(msg || t.notFound);
      haptic('error');
    } finally {
      setReading(false);
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
            <View pointerEvents="none" style={styles.frameWrap}>
              <FrameCorners />
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

      <Button variant="outline" icon="document-attach-outline" title={reading ? t.readingInvoice : t.uploadInvoice}
        loading={reading} onPress={uploadInvoice} style={{ marginTop: 12 }} />

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

// Corners drawn as SVG paths: absolute coordinates, so RTL layout can't mirror them.
function FrameCorners() {
  const [size, setSize] = useState(null);
  const L = 26, R = 14, W = 4, h = W / 2;
  const paths = size && (() => {
    const { w, hgt } = size;
    return [
      `M${h},${L} V${R} Q${h},${h} ${R},${h} H${L}`,                                  // top-left
      `M${w - L},${h} H${w - R} Q${w - h},${h} ${w - h},${R} V${L}`,                  // top-right
      `M${h},${hgt - L} V${hgt - R} Q${h},${hgt - h} ${R},${hgt - h} H${L}`,          // bottom-left
      `M${w - L},${hgt - h} H${w - R} Q${w - h},${hgt - h} ${w - h},${hgt - R} V${hgt - L}`, // bottom-right
    ];
  })();
  return (
    <View style={StyleSheet.absoluteFill} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, hgt: e.nativeEvent.layout.height })}>
      {paths && (
        <Svg width={size.w} height={size.hgt}>
          {paths.map((d, i) => <Path key={i} d={d} stroke={GOLD} strokeWidth={W} fill="none" strokeLinecap="round" />)}
        </Svg>
      )}
    </View>
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
