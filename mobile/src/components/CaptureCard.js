import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Switch, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Capture from '../../modules/coucou-capture';
import { usePrefs } from '../context/Prefs';
import { Txt, Card, Button } from './ui';
import ConfirmModal from './ConfirmModal';
import { getIngestKey } from '../api/account';
import { API_URL } from '../config';
import { fill } from '../i18n';
import { GOLD } from '../theme';

/** Turns the native capture key on for the phone (fetching one if needed). */
async function ensureKey(enabled) {
  const status = Capture.getStatus();
  const token = status.configured ? null : (await getIngestKey()).token;
  Capture.configure(enabled, API_URL, token);
}

/** Wipes the phone's capture key (on sign-out). */
export function disableCapture() {
  try { Capture?.configure(false, API_URL, ''); } catch { /* module missing */ }
}

/** Settings: automatic capture from notifications + the quick-settings button. Android only. */
export default function CaptureCard() {
  const { t, th, showToast } = usePrefs();
  const [status, setStatus] = useState(null);
  const [access, setAccess] = useState(false);
  const [explain, setExplain] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [busy, setBusy] = useState(false);
  const wantOn = useRef(false); // switched on, waiting for the user to grant access

  const refresh = useCallback(async () => {
    if (!Capture) return;
    const granted = Capture.hasNotificationAccess();
    setAccess(granted);
    if (wantOn.current) {
      wantOn.current = false;
      if (granted) {
        try { await ensureKey(true); showToast(t.captureOn); } catch { showToast(t.error, 'error'); }
      } else {
        setRestricted(true); // most likely blocked by Android's "restricted settings"
      }
    }
    setStatus(Capture.getStatus());
  }, [t]);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => sub.remove();
  }, [refresh]);

  if (!Capture || !status) return null;
  const on = status.enabled && access;

  const toggle = async (v) => {
    if (!v) {
      Capture.configure(false, API_URL, null);
      return refresh();
    }
    if (!access) return setExplain(true);
    setBusy(true);
    try { await ensureKey(true); showToast(t.captureOn); } catch { showToast(t.error, 'error'); }
    setBusy(false);
    refresh();
  };

  const addTile = async () => {
    try {
      await ensureKey(status.enabled);
      const r = await Capture.requestAddTile();
      showToast(r === 'added' || r === 'already' ? t.tileAdded : t.tileManual, 'info');
    } catch { showToast(t.error, 'error'); }
    refresh();
  };

  return (
    <Card style={{ marginTop: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="sparkles" size={18} color={GOLD} />
        <Txt w="b" size={16}>{t.captureTitle}</Txt>
      </View>
      <Txt size={12.5} color={th.muted} style={{ marginTop: 4, lineHeight: 20 }}>{t.captureHint}</Txt>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, marginTop: 6, borderBottomWidth: 1, borderColor: th.border }}>
        <Ionicons name="notifications-circle-outline" size={24} color={th.accent} />
        <Txt w="m" size={14.5} style={{ flex: 1 }}>{t.captureNotif}</Txt>
        <Switch value={on} disabled={busy} onValueChange={toggle} trackColor={{ true: GOLD, false: th.raised }} thumbColor="#FFF" />
      </View>
      {on && status.queued > 0 && <Txt size={12} color={th.muted} style={{ marginTop: 6 }}>{fill(t.captureQueued, { n: status.queued })}</Txt>}
      {restricted && !access && (
        <View style={{ marginTop: 10 }}>
          <Txt size={12.5} color={th.muted} style={{ lineHeight: 20 }}>{t.captureRestricted}</Txt>
          <Button small variant="ghost" icon="open-outline" title={t.openAppInfo} onPress={() => Capture.openAppSettings()} style={{ marginTop: 8 }} />
        </View>
      )}

      <View style={{ paddingTop: 12 }}>
        <Txt w="m" size={14.5}>{t.captureTile}</Txt>
        <Txt size={12.5} color={th.muted} style={{ marginTop: 3, lineHeight: 20 }}>{t.captureTileHint}</Txt>
        <Button small variant="outline" icon="add-circle-outline" title={t.addTile} onPress={addTile} style={{ marginTop: 10 }} />
      </View>

      <ConfirmModal visible={explain} icon="notifications-outline" title={t.captureNotif} message={t.captureNeedAccess}
        confirmLabel={t.continue} cancelLabel={t.cancel}
        onCancel={() => setExplain(false)}
        onConfirm={() => { setExplain(false); wantOn.current = true; Capture.openNotificationAccessSettings(); }} />
    </Card>
  );
}
