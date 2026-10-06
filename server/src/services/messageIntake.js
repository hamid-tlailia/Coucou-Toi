/**
 * One customer message → an order draft for the merchant to review.
 * Shared by the phone's copy button (routes/ingest.js) and the Meta
 * webhooks (routes/webhooks.js):
 *  - follow-up messages from the same sender within an hour extend the same
 *    draft, so an order typed over several messages ends up as one;
 *  - messages that aren't orders (greetings, chit-chat) are dropped;
 *  - photos and voice notes go to the AI along with the text.
 */
const { prisma } = require('../lib/db');
const { extractOrder } = require('./aiPipeline');
const { notifyNewDraft } = require('../routes/pendingOrders');

const THREAD_WINDOW_MS = 60 * 60 * 1000;

const phoneLike = (s) => {
  const d = String(s || '').replace(/[\s\-()+]/g, '');
  return /^\d{8,15}$/.test(d) ? d : null;
};

/**
 * @param sender      stable id of the customer on that channel (phone, PSID…)
 * @param senderName  display name, when the channel gives one
 * @param media       [{ mimeType, data(base64) }] photos / voice notes
 * @param keepOnFailure  AI unavailable → still file the raw message (webhooks
 *                       can't be retried by us) instead of reporting ai_busy
 * @returns {{ result: 'created'|'updated'|'not_order'|'ai_busy', id?: string }}
 */
async function intakeMessage({ userId, source, sender, senderName, text = '', media = [], keepOnFailure = false }) {
  const threadKey = sender ? `${source}:${sender}`.slice(0, 200) : null;
  const open = threadKey && await prisma.pendingOrder.findFirst({
    where: { userId, threadKey, status: 'pending', lastMessageAt: { gte: new Date(Date.now() - THREAD_WINDOW_MS) } },
    orderBy: { createdAt: 'desc' },
  });

  const note = text || (media.length ? '[صورة / رسالة صوتية]' : '');
  const combined = open?.rawText ? `${open.rawText}\n${note}` : note;
  const who = [senderName, sender && sender !== senderName ? sender : null].filter(Boolean).join(' — ');
  const hint = who ? `(المرسل كما يظهر في التطبيق: ${who})\n` : '';
  const draft = await extractOrder({ text: `${hint}${combined}`, media });

  if (draft.aiStatus !== 'ok') {
    if (!keepOnFailure) return { result: 'ai_busy' };
    // Don't lose the customer's message: file it as-is for manual review.
    draft.isOrder = true;
  }

  if (open) {
    const pick = (k) => draft[k] ?? open[k];
    const updated = await prisma.pendingOrder.update({
      where: { id: open.id },
      data: {
        customer: pick('customer'), phone: pick('phone') ?? phoneLike(sender), city: pick('city'),
        address: pick('address'), items: pick('items'), total: pick('total'), pay: draft.pay || open.pay,
        confidence: draft.confidence, rawText: combined, lastMessageAt: new Date(),
      },
    });
    return { result: 'updated', id: updated.id };
  }

  if (!draft.isOrder) return { result: 'not_order' };

  const pending = await prisma.pendingOrder.create({
    data: {
      userId, source, threadKey, lastMessageAt: new Date(),
      customer: draft.customer ?? senderName ?? (phoneLike(sender) ? null : sender || null),
      phone: draft.phone ?? phoneLike(sender),
      city: draft.city, address: draft.address, items: draft.items, total: draft.total,
      pay: draft.pay, rawText: combined, confidence: draft.confidence,
    },
  });
  await notifyNewDraft(pending);
  return { result: 'created', id: pending.id };
}

module.exports = { intakeMessage };
