const express = require('express');
const crypto = require('crypto');
const { prisma } = require('../lib/db');
const { processIncomingMessage } = require('../services/aiPipeline');

const router = express.Router();

/* ============================================================
 * Verification handshakes
 * Meta (WhatsApp / Instagram / Messenger) all use the same Graph API
 * subscription challenge: echo back hub.challenge once hub.verify_token
 * matches what we configured in the Meta App dashboard.
 * ============================================================ */
function metaVerifyHandler(envVar) {
  return (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token && token === process.env[envVar]) {
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
 * index.js. Skipped (with a console warning) if META_APP_SECRET isn't set,
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
 * Media fetchers — voice notes and photos arrive as media ids that must be
 * resolved to a downloadable URL via the Graph API before the AI pipeline
 * can read them.
 * ============================================================ */
async function resolveWhatsAppMediaUrl(mediaId, accessToken) {
  if (!mediaId || !accessToken) return null;
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

async function channelAccountFor(channel, externalId) {
  if (!externalId) return null;
  return prisma.channelAccount.findUnique({ where: { channel_externalId: { channel, externalId } } });
}

/**
 * Runs the AI pipeline on a normalized message and stores the result as a
 * PendingOrder awaiting merchant approval. Never throws — a bad/partial
 * extraction still gets logged for the admin to fix by hand rather than
 * silently dropping the customer's order.
 */
async function createPendingOrderFromMessage({ userId, source, text, audioUrl, imageUrl }) {
  const draft = await processIncomingMessage({ text, audioUrl, imageUrl });
  return prisma.pendingOrder.create({
    data: {
      userId,
      source,
      customer: draft.customer,
      phone: draft.phone,
      city: draft.city,
      address: draft.address,
      items: draft.items,
      total: draft.total,
      pay: draft.pay,
      rawText: draft.rawText,
      mediaUrl: imageUrl || audioUrl || null,
      confidence: draft.confidence,
    },
  });
}

/* ============================================================
 * WhatsApp Cloud API
 * ============================================================ */
router.post('/whatsapp', verifyMetaSignature, async (req, res) => {
  res.sendStatus(200); // ack immediately — Meta retries aggressively on anything else
  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message) return;

    const account = await channelAccountFor('whatsapp', value.metadata?.phone_number_id);
    if (!account) return console.warn('whatsapp webhook: no ChannelAccount for phone_number_id', value.metadata?.phone_number_id);

    let audioUrl = null, imageUrl = null;
    if (message.type === 'audio') audioUrl = await resolveWhatsAppMediaUrl(message.audio?.id, account.accessToken);
    if (message.type === 'image') imageUrl = await resolveWhatsAppMediaUrl(message.image?.id, account.accessToken);

    await createPendingOrderFromMessage({
      userId: account.userId,
      source: 'whatsapp',
      text: message.text?.body || message.image?.caption || null,
      audioUrl,
      imageUrl,
    });
  } catch (e) {
    console.error('whatsapp webhook failed', e);
  }
});

/* ============================================================
 * Instagram DM & Messenger — both delivered via the same Graph API
 * "messaging" entry shape once subscribed on a page.
 * ============================================================ */
function messengerLikeHandler(channel) {
  return async (req, res) => {
    res.sendStatus(200);
    try {
      const messaging = req.body?.entry?.[0]?.messaging?.[0];
      const message = messaging?.message;
      if (!message || message.is_echo) return; // ignore delivery receipts and our own outgoing messages

      const account = await channelAccountFor(channel, messaging.recipient?.id);
      if (!account) return console.warn(`${channel} webhook: no ChannelAccount for page id`, messaging.recipient?.id);

      const attachment = message.attachments?.[0];
      const imageUrl = attachment?.type === 'image' ? attachment.payload?.url : null;
      const audioUrl = attachment?.type === 'audio' ? attachment.payload?.url : null;

      await createPendingOrderFromMessage({
        userId: account.userId,
        source: channel,
        text: message.text || null,
        audioUrl,
        imageUrl,
      });
    } catch (e) {
      console.error(`${channel} webhook failed`, e);
    }
  };
}

router.post('/instagram', verifyMetaSignature, messengerLikeHandler('instagram'));
router.post('/messenger', verifyMetaSignature, messengerLikeHandler('facebook'));

/* ============================================================
 * TikTok Direct Messaging
 * TikTok's messaging payload shape isn't Graph-API-compatible and varies by
 * product tier; this normalizes the common fields (sender id, text, media
 * url) but MUST be checked against the merchant's actual TikTok API
 * response before going live.
 * ============================================================ */
router.post('/tiktok', async (req, res) => {
  res.sendStatus(200);
  try {
    const event = req.body?.data || req.body;
    if (!event?.message) return;

    const account = await channelAccountFor('tiktok', event.to_user_id || event.recipient_id);
    if (!account) return console.warn('tiktok webhook: no ChannelAccount for recipient id', event.to_user_id);

    await createPendingOrderFromMessage({
      userId: account.userId,
      source: 'tiktok',
      text: event.message?.text || null,
      audioUrl: event.message?.audio_url || null,
      imageUrl: event.message?.image_url || null,
    });
  } catch (e) {
    console.error('tiktok webhook failed', e);
  }
});

module.exports = router;
