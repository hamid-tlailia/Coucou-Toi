import { useEffect } from 'react';
import { Platform } from 'react-native';

// Android only: the app appears in the system "Share" menu for text (see the
// expo-share-intent plugin in app.json). Other platforms get a no-op.
const useShareIntent = Platform.OS === 'android'
  ? require('expo-share-intent').useShareIntent
  : () => ({ hasShareIntent: false, shareIntent: {}, resetShareIntent: () => {} });

/** Calls `onText(text)` whenever text is shared into the app. */
export default function useSharedText(onText) {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({ resetOnBackground: false });
  useEffect(() => {
    if (!hasShareIntent) return;
    const text = (shareIntent?.text || shareIntent?.webUrl || '').trim();
    if (text) onText(text);
    resetShareIntent();
  }, [hasShareIntent]);
}
