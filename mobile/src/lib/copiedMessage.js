import { useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';

/*
 * WhatsApp, Instagram, Messenger and TikTok don't offer "Share" on a text
 * message, but they all have "Copy". When the app comes to the foreground
 * with a new text on the clipboard, it is offered for analysis.
 */

const KEY = 'clip_seen';
let seen = null; // hash of the last clipboard text already offered/handled

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}

async function loadSeen() {
  if (seen === null) seen = (await SecureStore.getItemAsync(KEY).catch(() => null)) || '';
  return seen;
}

/** Marks a text as handled, so it isn't offered again (also used for text the app copies itself). */
export function markClipSeen(text) {
  seen = hash(String(text || '').trim());
  SecureStore.setItemAsync(KEY, seen).catch(() => {});
}

const looksLikeMessage = (s) => s.length >= 6 && s.length <= 2000 && !/^https?:\/\/\S+$/i.test(s);

/** Returns [text | null, dismiss]. */
export default function useCopiedMessage() {
  const [text, setText] = useState(null);

  const check = useCallback(async () => {
    try {
      if (!(await Clipboard.hasStringAsync())) return;
      const s = (await Clipboard.getStringAsync()).trim();
      if (!looksLikeMessage(s)) return;
      if (hash(s) === (await loadSeen())) return;
      setText(s);
    } catch { /* clipboard unavailable */ }
  }, []);

  useEffect(() => {
    // Android only lets the focused app read the clipboard: wait a beat after resume.
    const first = setTimeout(check, 800);
    let timer;
    const sub = AppState.addEventListener('change', (st) => {
      clearTimeout(timer);
      if (st === 'active') timer = setTimeout(check, 600);
    });
    return () => { clearTimeout(first); clearTimeout(timer); sub.remove(); };
  }, [check]);

  const dismiss = useCallback(() => {
    if (text) markClipSeen(text);
    setText(null);
  }, [text]);

  return [text, dismiss];
}
