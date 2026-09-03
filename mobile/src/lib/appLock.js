import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const KEY = 'ccl.applock.enabled';

export const isAppLockEnabled = async () => (await SecureStore.getItemAsync(KEY)) === '1';
export const setAppLockEnabled = (v) => SecureStore.setItemAsync(KEY, v ? '1' : '0');

/**
 * Face ID / Touch ID gate shown on cold start and on resume-from-background,
 * so a stolen-but-unlocked phone still can't open the order list.
 */
export async function requireBiometricUnlock(t) {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !enrolled) return true; // nothing to gate with — don't lock the user out
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: t?.unlockPrompt || 'افتح القفل للمتابعة',
    disableDeviceFallback: false, // allow passcode fallback like every iOS app
  });
  return res.success;
}
