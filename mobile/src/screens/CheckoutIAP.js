import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert, Platform } from 'react-native';
import * as IAP from 'react-native-iap';
import BottomSheet from '../components/BottomSheet';
import { PrimaryButton } from '../components/ui';
import { IAP_SKUS } from '../config';
import { verifyIosReceipt, verifyAndroidPurchase, restorePurchases } from '../api/billing';
import { DEEP, GREEN } from '../theme';

/**
 * Apple requires digital-good subscriptions to go through StoreKit — no
 * card form here. The flow is:
 *   1. Ask StoreKit to start the purchase (native Apple payment sheet).
 *   2. Apple returns a *signed* transaction receipt to the device.
 *   3. We send that receipt — not the plan choice — to our server.
 *   4. The server verifies the receipt directly with Apple's servers and
 *      only THEN marks the plan active. The device can't unlock a plan
 *      by lying about a purchase.
 */
export default function CheckoutIAP({ visible, onClose, plan, cycle, t, th, onActivated, showToast }) {
  const [stage, setStage] = useState('idle'); // idle | buying | verifying | done | error
  const [ready, setReady] = useState(false);

  const skuKey = cycle === 'yearly' ? `${plan?.id}_year` : plan?.id;
  const sku = plan ? IAP_SKUS[skuKey] : null;

  useEffect(() => {
    if (!visible) return;
    let sub;
    (async () => {
      await IAP.initConnection();
      if (Platform.OS === 'android') await IAP.flushFailedPurchasesCachedAsPendingAndroid().catch(() => {});
      setReady(true);
      sub = IAP.purchaseUpdatedListener(onPurchaseUpdate);
    })();
    return () => { sub?.remove(); IAP.endConnection(); };
  }, [visible]);

  const onPurchaseUpdate = useCallback(async (purchase) => {
    setStage('verifying');
    try {
      if (Platform.OS === 'ios') {
        await verifyIosReceipt(purchase.transactionId, purchase.productId);
      } else {
        await verifyAndroidPurchase(purchase.purchaseToken, purchase.productId);
      }
      await IAP.finishTransaction({ purchase, isConsumable: false });
      setStage('done');
      setTimeout(() => { onActivated(); }, 1200);
    } catch (e) {
      setStage('error');
    }
  }, []);

  const buy = async () => {
    if (!sku) return;
    setStage('buying');
    try {
      await IAP.requestSubscription({ sku });
      // result arrives async via purchaseUpdatedListener above
    } catch (e) {
      if (e.code !== 'E_USER_CANCELLED') setStage('error');
      else setStage('idle');
    }
  };

  const restore = async () => {
    try {
      await IAP.getAvailablePurchases(); // re-syncs StoreKit's local receipt
      await restorePurchases();
      showToast(t.restored);
      onActivated();
    } catch { Alert.alert(t.error); }
  };

  return (
    <BottomSheet visible={visible} onClose={stage === 'buying' || stage === 'verifying' ? () => {} : onClose} th={th}>
      <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center', color: th.text }}>{t.payment}</Text>

      {plan && (
        <View style={{ backgroundColor: th.raised, borderRadius: 14, padding: 14, marginTop: 14 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: th.text }}>{t[`p_${plan.id}`]}</Text>
          <Text style={{ fontSize: 11, color: th.muted, marginTop: 2 }}>{plan.quota} {t.ordersMo} · {cycle === 'yearly' ? t.yearly : t.monthly}</Text>
        </View>
      )}

      <View style={{ alignItems: 'center', paddingVertical: 26 }}>
        {stage === 'idle' && ready && <PrimaryButton th={th} title={` ${t.choosePlan}`} onPress={buy} />}
        {(stage === 'buying' || stage === 'verifying') && (
          <>
            <ActivityIndicator size="large" color={DEEP} />
            <Text style={{ marginTop: 14, color: th.muted, fontSize: 12.5 }}>{t.processing || '…'}</Text>
          </>
        )}
        {stage === 'done' && (
          <>
            <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#E7F4EC', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: GREEN, fontSize: 26 }}>✓</Text>
            </View>
            <Text style={{ marginTop: 12, fontWeight: '700', color: th.text }}>{t.paySuccess}</Text>
          </>
        )}
        {stage === 'error' && <Text style={{ color: '#C24B44' }}>{t.error}</Text>}
      </View>

      <Text onPress={restore} style={{ textAlign: 'center', color: th.muted, fontSize: 12.5, marginBottom: 6 }}>{t.restore}</Text>
      <Text style={{ fontSize: 10.5, color: th.muted, textAlign: 'center' }}>{t.iapNote}</Text>
    </BottomSheet>
  );
}
