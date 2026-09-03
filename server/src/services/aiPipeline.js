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
async function extractOrder({ text, imageUrl }) {
  const empty = () => ({
    customer: null, phone: null, city: null, address: null,
    items: null, total: null, pay: 'cod', confidence: 0,
  });

  if (!process.env.GEMINI_API_KEY || (!text && !imageUrl)) return empty();

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

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
      }
    );
    if (!res.ok) return empty();

    const data = await res.json();
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) return empty();

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
    };
  } catch (e) {
    console.error('extractOrder failed', e);
    return empty();
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
