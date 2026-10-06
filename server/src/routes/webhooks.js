const express = require('express');
const crypto = require('crypto');
const { prisma } = require('../lib/db');
const { intakeMessage } = require('../services/messageIntake');
const { background } = require('../lib/background');

const router = express.Router();
const GRAPH = 'https://graph.facebook.com/v21.0';

/* ============================================================
 * Verification handshakes
 * Meta (WhatsApp / Instagram / Messenger) all use the same Graph API
 * subscription challenge: echo back hub.challenge once hub.verify_token
 * matches what we configured in the Meta App dashboard. One shared
 * META_VERIFY_TOKEN works for all three; per-channel ones still win.
 * ============================================================ */
function metaVerifyHandler(envVar) {
  return (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expected = process.env[envVar] || process.env.META_VERIFY_TOKEN;
    if (mode === 'subscribe' && token && token === expected) {
      return res.status(200).send(challenge);
    }
    res.sendStatus(403);
  };
}

router.get('/whatsapp', metaVerifyHandler('WHATSAPP_VERIFY_TOKEN'));
router.get('/instagram', metaVerifyHandler('INSTAGRAM_VERIFY_TOKEN'));
router.get('/messenger', metaVerifyHandler('MESSENGER_VERIFY_TOKEN'));

// TikTok's own webhook verification isn't a Graph-style challenge; it just
// needs a 200. Real signature/challenge handling depends on the exact
// TikTok product (Business Messaging vs. Events API) the merchant is on —
// adjust against TikTok's current docs before going live.
router.get('/tiktok', (req, res) => res.sendStatus(200));

/* ============================================================
 * Signature check — every Meta webhook POST carries
 * X-Hub-Signature-256: sha256=<hmac of the raw body with the app secret>.
 * Requires req.rawBody, captured by the express.json() verify hook in
 * app.js. Skipped (with a console warning) if META_APP_SECRET isn't set,
 * so local development without a Meta app configured still works.
 * ============================================================ */
function verifyMetaSignature(req, res, next) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    console.warn('META_APP_SECRET not set — skipping webhook signature verification');
    return next();
  }
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || !req.rawBody) return res.sendStatus(401);

  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.sendStatus(401);
  next();
}

/* ============================================================
 * Which merchant a message is for. Either a ChannelAccount row, or — for
 * this single-store setup — the ids and tokens in the server's environment
 * (Vercel → Settings → Environment Variables):
 *   WhatsApp:  WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN
 *   Instagram: INSTAGRAM_ACCOUNT_ID (or INSTAGRAM_PAGE_ID), INSTAGRAM_ACCESS_TOKEN
 *   Messenger: MESSENGER_PAGE_ID, MESSENGER_ACCESS_TOKEN
 * One Facebook Page token with Instagram permissions works for both of the
 * last two. The store owner is OWNER_EMAIL, or the first account.
 * ============================================================ */
const ENV_CHANNELS = {
  whatsapp: { ids: ['WHATSAPP_PHONE_NUMBER_ID'], token: ['WHATSAPP_ACCESS_TOKEN'] },
  instagram: { ids: ['INSTAGRAM_ACCOUNT_ID', 'INSTAGRAM_PAGE_ID'], token: ['INSTAGRAM_ACCESS_TOKEN', 'MESSENGER_ACCESS_TOKEN'] },
  facebook: { ids: ['MESSENGER_PAGE_ID'], token: ['MESSENGER_ACCESS_TOKEN', 'INSTAGRAM_ACCESS_TOKEN'] },
};
const env = (keys) => keys.map((k) => process.env[k]).find(Boolean) || null;

/** Whether each channel has what it needs in the environment (for the app's Settings). */
function channelStatus() {
  return Object.fromEntries(Object.entries(ENV_CHANNELS).map(([ch, c]) => [ch, !!(env(c.ids) && env(c.token))]));
}

let ownerId = null;
async function storeOwnerId() {
  if (!ownerId) {
    const owner = process.env.OWNER_EMAIL
      ? await prisma.user.findUnique({ where: { email: process.env.OWNER_EMAIL.toLowerCase() } })
      : await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    ownerId = owner?.id || null;
  }
  return ownerId;
}

async function channelAccountFor(channel, externalId) {
  if (!externalId) return null;
  const row = await prisma.channelAccount.findUnique({ where: { channel_externalId: { channel, externalId } } });
  if (row) return row;
  const c = ENV_CHANNELS[channel];
  if (!c) return null;
  const ids = c.ids.map((k) => process.env[k]).filter(Boolean);
  if (!ids.includes(String(externalId))) {
    console.warn(`${channel} webhook: id ${externalId} not configured (set ${c.ids[0]}=${externalId} in Vercel if it is yours)`);
    return null;
  }
  const userId = await storeOwnerId();
  return userId ? { userId, accessToken: env(c.token) } : null;
}

/* ============================================================
 * Media — photos and voice notes are downloaded here (WhatsApp needs the
 * access token even for the download) and handed to the AI inline.
 * ============================================================ */
const MAX_MEDIA = 8 * 1024 * 1024;

async function download(url, token) {
  if (!url) return null;
  try {
    const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_MEDIA) return null;
    const mimeType = (res.headers.get('content-type') || 'application/octet-stream').split(';')[0];
    return { mimeType, data: buf.toString('base64') };
  } catch {
    return null;
  }
}

async function whatsappMedia(mediaId, token) {
  if (!mediaId || !token) return null;
  try {
    const res = await fetch(`${GRAPH}/${mediaId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const { url, mime_type: mime } = await res.json();
    const file = await download(url, token);
    return file && mime ? { ...file, mimeType: mime.split(';')[0] } : file;
  } catch {
    return null;
  }
}

/** Customer's display name on Messenger / Instagram (best effort). */
async function profileName(psid, token, fields) {
  if (!psid || !token) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${GRAPH}/${psid}?fields=${fields}&access_token=${encodeURIComponent(token)}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const p = await res.json();
    return p.name || p.username || null;
  } catch {
    return null;
  }
}

/* ============================================================
 * WhatsApp Cloud API
 * ============================================================ */
router.post('/whatsapp', verifyMetaSignature, (req, res) => {
  res.sendStatus(200); // ack immediately — Meta retries aggressively on anything else
  background((async () => {
    for (const entry of req.body?.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const account = await channelAccountFor('whatsapp', value.metadata?.phone_number_id);
        if (!account) continue;
        const names = Object.fromEntries((value.contacts || []).map((c) => [c.wa_id, c.profile?.name]));

        for (const message of value.messages || []) {
          const media = [];
          const mediaId = message.image?.id || message.audio?.id || message.voice?.id;
          const file = await whatsappMedia(mediaId, account.accessToken);
          if (file) media.push(file);
          const text = message.text?.body || message.image?.caption || '';
          if (!text && !media.length) continue; // reactions, stickers, read receipts…

          await intakeMessage({
            userId: account.userId, source: 'whatsapp',
            sender: message.from, senderName: names[message.from] || null,
            text, media, keepOnFailure: true,
          });
        }
      }
    }
  })().catch((e) => console.error('whatsapp webhook failed', e)));
});

/* ============================================================
 * Instagram DM & Messenger — both delivered via the same Graph API
 * "messaging" entry shape once subscribed on a page.
 * ============================================================ */
function messengerLikeHandler(channel) {
  return (req, res) => {
    res.sendStatus(200);
    background((async () => {
      for (const entry of req.body?.entry || []) {
        for (const messaging of entry.messaging || []) {
          const message = messaging.message;
          if (!message || message.is_echo) continue; // receipts and our own outgoing messages

          const account = await channelAccountFor(channel, messaging.recipient?.id || entry.id);
          if (!account) continue;

          const media = [];
          for (const att of message.attachments || []) {
            if (att.type === 'image' || att.type === 'audio') {
              const file = await download(att.payload?.url);
              if (file) media.push(file);
            }
          }
          const text = message.text || '';
          if (!text && !media.length) continue;

          const senderId = messaging.sender?.id;
          const fields = channel === 'instagram' ? 'name,username' : 'name';
          await intakeMessage({
            userId: account.userId, source: channel,
            sender: senderId, senderName: await profileName(senderId, account.accessToken, fields),
            text, media, keepOnFailure: true,
          });
        }
      }
    })().catch((e) => console.error(`${channel} webhook failed`, e)));
  };
}

router.post('/instagram', verifyMetaSignature, messengerLikeHandler('instagram'));
router.post('/messenger', verifyMetaSignature, messengerLikeHandler('facebook'));

/* ============================================================
 * TikTok Direct Messaging
 * TikTok's messaging payload shape isn't Graph-API-compatible and varies by
 * product tier; this normalizes the common fields (sender id, text) but
 * MUST be checked against the merchant's actual TikTok API response before
 * going live.
 * ============================================================ */
router.post('/tiktok', (req, res) => {
  res.sendStatus(200);
  background((async () => {
    const event = req.body?.data || req.body;
    if (!event?.message?.text) return;

    const account = await channelAccountFor('tiktok', event.to_user_id || event.recipient_id);
    if (!account) return console.warn('tiktok webhook: no ChannelAccount for recipient id', event.to_user_id);

    await intakeMessage({
      userId: account.userId, source: 'tiktok',
      sender: event.from_user_id || event.sender_id || null,
      text: event.message.text, keepOnFailure: true,
    });
  })().catch((e) => console.error('tiktok webhook failed', e)));
});

module.exports = router;
module.exports.channelStatus = channelStatus;
