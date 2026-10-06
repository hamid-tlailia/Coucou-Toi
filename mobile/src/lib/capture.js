import Capture from '../../modules/coucou-capture';
import { getIngestKey } from '../api/account';
import { API_URL } from '../config';

/** Gives the quick-settings tile its capture key (once per phone). */
export async function ensureCaptureKey() {
  if (!Capture) return;
  try {
    const token = Capture.getStatus().configured ? null : (await getIngestKey()).token;
    Capture.configure(API_URL, token);
  } catch { /* offline — next app start retries */ }
}

/** Signs the tile out (on sign-out). */
export function disableCapture() {
  try { Capture?.configure(API_URL, ''); } catch { /* module missing */ }
}
