/**
 * Turns a raw incoming social message (text, and/or a voice note, and/or a
 * product photo) into a structured order draft: customer, phone, city,
 * address, items, total, payment method. Nothing here ever writes to the
 * database or trusts its own output as final — the result always lands as
 * a PendingOrder that a human approves (see routes/pendingOrders.js).
 */

const EXTRACTION_PROMPT = `أنت مساعد استلام طلبات لمتجر تجارة إلكترونية على وسائل التواصل الاجتماعي.
اقرأ رسالة العميل (وقد تكون نص، أو تفريغ رسالة صوتية، أو وصف صورة) واستخرج معلومات الطلب.
أعد النتيجة بصيغة JSON فقط وفق هذا الشكل بالضبط، بدون أي نص إضافي:
{
  "customer": "اسم العميل أو null",
  "phone": "رقم الهاتف أو null",
  "city": "المدينة أو null",
  "address": "العنوان التفصيلي أو null",
  "items": "وصف المنتجات والكميات كنص واحد أو null",
  "total": رقم المبلغ الإجمالي بالدينار أو null,
  "pay": "cod" أو "paid" أو "unpaid",
  "confidence": رقم بين 0 و 1 يعبر عن مدى ثقتك في دقة الاستخراج
}
إن لم تجد معلومة، ضع لها null. لا تخترع بيانات غير موجودة في الرسالة.`;

/**
 * Transcribes an Arabic voice note via Groq's hosted Whisper Large v3.
 * Returns '' (not throw) on any failure — a failed transcription should
 * degrade the extraction, not crash the whole webhook.
 */
async function transcribeAudio(audioUrl) {
  if (!audioUrl || !process.env.GROQ_API_KEY) return '';
  try {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) return '';
    const audioBuffer = await audioRes.arrayBuffer();

    const form = new FormData();
    form.append('file', new Blob([audioBuffer]), 'voice.ogg');
    form.append('model', 'whisper-large-v3');
    form.append('language', 'ar');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: form,
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.text || '';
  } catch (e) {
    console.error('transcribeAudio failed', e);
    return '';
  }
}

/**
 * Sends the customer's text (and optionally a product photo) to Gemini 1.5
 * Flash with structured JSON output, and returns a best-effort order draft.
 * Never throws — an extraction failure just yields an empty, low-confidence
 * draft that still shows up for manual review instead of getting lost.
 */
// Tried in order; the first model the key has access to wins. Lets the app
// keep working when Google retires a model name.
const MODELS = [...new Set([process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'].filter(Boolean))];

async function extractOrder({ text, imageUrl }) {
  const empty = (aiStatus) => ({
    customer: null, phone: null, city: null, address: null,
    items: null, total: null, pay: 'cod', confidence: 0, aiStatus,
  });

  if (!process.env.GEMINI_API_KEY) return empty('no_key');
  if (!text && !imageUrl) return empty('empty');

  try {
    const parts = [{ text: `${EXTRACTION_PROMPT}\n\nرسالة العميل:\n${text || '(بدون نص، انظر الصورة المرفقة)'}` }];

    if (imageUrl) {
      const imgRes = await fetch(imageUrl);
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
        parts.push({ inlineData: { mimeType, data: buf.toString('base64') } });
      }
    }

    let data = null;
    for (const model of MODELS) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
          }),
        }
      );
      if (res.ok) { data = await res.json(); break; }
      const body = await res.text().catch(() => '');
      console.error(`gemini ${model} failed`, res.status, body.slice(0, 300));
      if (res.status !== 404) break; // bad key / quota: other models won't help
    }
    if (!data) return empty('failed');

    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) return empty('failed');

    const parsed = JSON.parse(jsonText);
    return {
      customer: parsed.customer || null,
      phone: parsed.phone || null,
      city: parsed.city || null,
      address: parsed.address || null,
      items: parsed.items || null,
      total: typeof parsed.total === 'number' ? parsed.total : null,
      pay: ['cod', 'paid', 'unpaid'].includes(parsed.pay) ? parsed.pay : 'cod',
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
      aiStatus: 'ok',
    };
  } catch (e) {
    console.error('extractOrder failed', e);
    return empty('failed');
  }
}

/**
 * Full pipeline for one normalized incoming message: transcribe audio if
 * present, fold it into the text, run extraction, and return everything
 * routes/webhooks.js needs to create a PendingOrder.
 */
async function processIncomingMessage({ text, audioUrl, imageUrl }) {
  const transcript = audioUrl ? await transcribeAudio(audioUrl) : '';
  const combinedText = [text, transcript].filter(Boolean).join('\n');
  const draft = await extractOrder({ text: combinedText, imageUrl });
  return { ...draft, rawText: combinedText || null };
}

module.exports = { transcribeAudio, extractOrder, processIncomingMessage };
