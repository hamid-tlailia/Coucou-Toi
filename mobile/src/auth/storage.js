import * as SecureStore from 'expo-secure-store';

/**
 * Tokens live in the iOS Keychain / Android Keystore — never AsyncStorage,
 * which is plain text on disk and readable from a backup.
 */
const ACCESS = 'ccl.access';
const REFRESH = 'ccl.refresh';

const opts = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function saveTokens({ accessToken, refreshToken }) {
  await SecureStore.setItemAsync(ACCESS, accessToken, opts);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH, refreshToken, opts);
}
export const getAccess = () => SecureStore.getItemAsync(ACCESS);
export const getRefresh = () => SecureStore.getItemAsync(REFRESH);
export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS).catch(() => {});
  await SecureStore.deleteItemAsync(REFRESH).catch(() => {});
}
