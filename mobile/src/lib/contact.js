import { Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as IntentLauncher from 'expo-intent-launcher';
import { waNumber } from './orderActions';

// Android packages of each app (first installed one wins), then a web fallback.
const APPS = {
  facebook: { packages: ['com.facebook.orca', 'com.facebook.mlite', 'com.facebook.katana'], web: 'https://www.messenger.com/', ios: 'fb-messenger://' },
  instagram: { packages: ['com.instagram.android', 'com.instagram.lite'], web: 'https://www.instagram.com/direct/inbox/', ios: 'instagram://direct-inbox' },
  tiktok: { packages: ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill', 'com.zhiliaoapp.musically.go'], web: 'https://www.tiktok.com/messages', ios: 'snssdk1233://' },
};

export const isSocial = (source) => !!APPS[source];

async function openApp(source) {
  const app = APPS[source];
  if (Platform.OS === 'android') {
    for (const packageName of app.packages) {
      try {
        // Launches the app's main screen directly (works without deep links).
        await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
          packageName,
          category: 'android.intent.category.LAUNCHER',
          flags: 0x10000000, // FLAG_ACTIVITY_NEW_TASK
        });
        return;
      } catch { /* not installed → try next */ }
    }
  } else {
    try { await Linking.openURL(app.ios); return; } catch { /* fall through */ }
  }
  await Linking.openURL(app.web).catch(() => {});
}

/**
 * Sends `message` to the customer: WhatsApp opens the chat with the text
 * ready; Messenger / Instagram / TikTok get the text on the clipboard and the
 * app opened, so it only needs pasting. Returns 'whatsapp' | 'copied'.
 */
export async function messageCustomer(order, message, via = order.source) {
  if (!isSocial(via)) {
    await Linking.openURL(`https://wa.me/${waNumber(order.phone)}?text=${encodeURIComponent(message)}`);
    return 'whatsapp';
  }
  await Clipboard.setStringAsync(message);
  await openApp(via);
  return 'copied';
}
