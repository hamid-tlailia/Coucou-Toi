import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Capture from '../../modules/coucou-capture';
import { usePrefs } from '../context/Prefs';
import { Txt, Card, Button } from './ui';
import { ensureCaptureKey } from '../lib/capture';
import { GOLD } from '../theme';

/** Settings: the "analyse copied message" quick-settings button. Android only. */
export default function CaptureCard() {
  const { t, th, showToast } = usePrefs();
  if (!Capture) return null;

  const addTile = async () => {
    await ensureCaptureKey();
    try {
      const r = await Capture.requestAddTile();
      showToast(r === 'added' || r === 'already' ? t.tileAdded : t.tileManual, 'info');
    } catch { showToast(t.tileManual, 'info'); }
  };

  return (
    <Card style={{ marginTop: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="sparkles" size={18} color={GOLD} />
        <Txt w="b" size={16}>{t.captureTile}</Txt>
      </View>
      <Txt size={12.5} color={th.muted} style={{ marginTop: 4, lineHeight: 20 }}>{t.captureTileHint}</Txt>
      <Button small variant="outline" icon="add-circle-outline" title={t.addTile} onPress={addTile} style={{ marginTop: 12 }} />
    </Card>
  );
}
