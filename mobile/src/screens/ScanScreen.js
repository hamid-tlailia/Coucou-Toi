import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Input, PrimaryButton, GhostButton } from '../components/ui';
import { findByCode, updateOrder } from '../api/orders';
import { formatTND } from '../lib/money';
import { GREEN, RED } from '../theme';

export default function ScanScreen({ t, th, theme, showToast }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState('');
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const lock = useRef(false);

  const lookup = async (code) => {
    if (!code) return;
    try {
      const order = await findByCode(code.trim());
      setResult(order);
      setError('');
    } catch {
      setResult(null);
      setError(t.notFound);
    }
  };

  const onBarcodeScanned = ({ data }) => {
    if (lock.current) return;
    lock.current = true;
    setScanned(true);
    const idMatch = data.match(/id=([^&]+)/);
    const codeMatch = data.match(/code=([^&]+)/);
    lookup(codeMatch?.[1] || idMatch?.[1] || data);
    setTimeout(() => { lock.current = false; }, 1200);
  };

  const markPaid = async () => {
    const updated = await updateOrder(result.id, { pay: 'paid' });
    setResult(updated);
    showToast(t.pay_paid);
  };
  const confirmDelivery = async () => {
    const updated = await updateOrder(result.id, { status: 'delivered' });
    setResult(updated);
    showToast(t.st_delivered);
  };

  if (!permission) return <View style={{ flex: 1 }} />;
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Text style={{ color: th.text, textAlign: 'center', marginBottom: 14 }}>{t.cameraDenied}</Text>
        <PrimaryButton th={th} title={t.scanBtn} onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center', color: th.text }}>{t.scanTitle}</Text>
      <Text style={{ fontSize: 12, color: th.muted, textAlign: 'center', marginVertical: 8 }}>{t.scanHint}</Text>

      <View style={styles.camWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128'] }}
          onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
        />
        <View pointerEvents="none" style={styles.frame} />
      </View>

      <Input th={th} placeholder={`${t.manualCode} — 1042-5678`} value={manualCode} onChangeText={setManualCode} onSubmitEditing={() => lookup(manualCode)} style={{ marginTop: 14 }} />
      <PrimaryButton th={th} title={t.scanBtn} onPress={() => lookup(manualCode)} style={{ marginTop: 10 }} />

      {!!error && <Text style={{ color: RED, textAlign: 'center', marginTop: 12 }}>{error}</Text>}

      {result && (
        <View style={[styles.resultCard, { backgroundColor: th.surface }]}>
          <Text style={{ fontWeight: '700', textAlign: 'center', color: th.text, marginBottom: 8 }}>#{result.id} — {result.customer}</Text>
          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <View style={{ paddingHorizontal: 18, paddingVertical: 9, borderRadius: 12, backgroundColor: result.pay === 'paid' ? '#E7F4EC' : '#FBEAE8' }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: result.pay === 'paid' ? GREEN : RED }}>
                {result.pay === 'paid' ? '✅ ' : '⏳ '}{t[`pay_${result.pay}`]}
              </Text>
            </View>
          </View>
          <Row t={t} th={th} label={t.amount} value={formatTND(result.total)} />
          <Row t={t} th={th} label={t.address} value={result.city} />
          {result.pay !== 'paid' && <PrimaryButton th={th} title={t.markPaid} onPress={markPaid} style={{ marginTop: 12 }} />}
          <PrimaryButton th={th} title={t.confirmDelivery} onPress={confirmDelivery} style={{ marginTop: 8, backgroundColor: '#128C7E' }} />
        </View>
      )}
    </View>
  );
}
function Row({ label, value, th }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
      <Text style={{ color: th.muted, fontSize: 12.5 }}>{label}</Text>
      <Text style={{ color: th.text, fontWeight: '600', fontSize: 12.5 }}>{value}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  camWrap: { height: 200, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' },
  frame: { position: 'absolute', top: 20, left: 20, right: 20, bottom: 20, borderWidth: 2, borderColor: 'rgba(243,217,168,0.7)', borderRadius: 14 },
  resultCard: { borderRadius: 18, padding: 16, marginTop: 16 },
});
