import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

/**
 * Android-only native side of message capture (see android/…/coucoucapture):
 * reads customer messages from messaging-app notifications, and the
 * quick-settings tile / text-selection entry that send copied text.
 * null on iOS or in a build without the module.
 */
const Native = Platform.OS === 'android' ? requireOptionalNativeModule('CoucouCapture') : null;

export default Native;
