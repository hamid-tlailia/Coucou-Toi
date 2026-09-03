import { Platform } from 'react-native';

/**
 * Best-effort device-integrity signal. This is NOT a security boundary —
 * jailbreak/root detection is always bypassable client-side — it only
 * degrades UX for obviously-tampered devices (e.g. refuse to cache a
 * payment token) while the server remains the actual trust boundary.
 */
export function looksTampered() {
  // Placeholder hook: wire up `expo-device` + known jailbreak file paths,
  // or a library like `jail-monkey` if the client wants that signal.
  return false;
}

/** Redacts anything that looks like a card number / token before logging. */
export function scrubForLogs(obj) {
  const s = JSON.stringify(obj);
  return s
    .replace(/\b\d{12,19}\b/g, '[card]')
    .replace(/"accessToken":"[^"]+"/g, '"accessToken":"[redacted]"')
    .replace(/"refreshToken":"[^"]+"/g, '"refreshToken":"[redacted]"');
}

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
