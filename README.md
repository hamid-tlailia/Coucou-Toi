# Coco Love — Order Manager

Full mobile app (iOS + Android, React Native / Expo) with a Node.js/Express
backend. Currency: Tunisian dinar (TND). Search finds an order by tracking
code / barcode, customer name, or order number.

## Structure

```
mobile/   Expo React Native app (iOS + Android)
server/   Node.js + Express + PostgreSQL (Prisma) API
```

## Quick start

### Server
```bash
cd server
cp .env.example .env        # fill in real secrets — never commit .env
npm install
npx prisma migrate dev      # creates the database tables
npm run dev                 # http://localhost:8080
```

### Mobile
```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```
Press `i` for the iOS simulator, `a` for Android, or scan the QR with
Expo Go on the client's iPhone for a first look before a real build.

## AI Smart Seller (البائع الذكي)

Adds an AI order-taking layer on top of the existing order manager, all
inside this same app — no separate frontend, no separate database.

**Flow:** a customer messages the merchant's WhatsApp/Instagram/Messenger/
TikTok → the server's webhook receives it → `services/aiPipeline.js`
transcribes any voice note (Groq Whisper) and extracts customer name,
phone, city, address, products and payment method with Gemini 1.5 Flash
(structured JSON output) → the result is stored as a `PendingOrder`, never
a real order yet → it shows up under the **"البائع الذكي"** tab in the app
for the merchant to review, correct, and approve or reject → approving
creates a real `Order` exactly like tapping "+" does today, with its own
tracking code and barcode receipt (`ReceiptSheet`) → scanning that barcode
in the existing **Scan** tab is how the order's payment/delivery status
gets updated, unchanged from before.

**New pieces:**
- `server/prisma/schema.prisma` — `PendingOrder` (the AI draft) and
  `ChannelAccount` (maps a WhatsApp number / FB or IG page / TikTok
  account to the merchant it belongs to).
- `server/src/services/aiPipeline.js` — Groq Whisper transcription +
  Gemini structured-JSON order extraction.
- `server/src/routes/webhooks.js` — `/webhooks/{whatsapp,instagram,messenger,tiktok}`,
  verifies Meta's webhook handshake and `X-Hub-Signature-256`, resolves the
  merchant via `ChannelAccount`, and creates a `PendingOrder`.
- `server/src/routes/pendingOrders.js` — list/approve/reject drafts.
  Approving consumes a quota slot, same as a manual order.
- `mobile/src/screens/SmartOrdersScreen.js` — the review UI, with an
  editable form per draft and a confidence badge from the AI.

**Setup required before this receives real messages** — see the full
step-by-step guide below: *"الحصول على مفاتيح كل منصة وربط الحسابات"*.
In short: get a Gemini key, a Groq key, a Meta App (WhatsApp + Messenger +
Instagram), and optionally a TikTok developer app; fill `server/.env`;
point each platform's webhook at `https://your-domain.com/webhooks/<channel>`;
then run `npm run link-channels` once to connect them to your account.

This deployment is sized for a **single merchant** — the free plan's quota
was bumped to effectively unlimited (`mobile/src/config.js` and
`server/src/lib/plans.js`, both `free.quota`), so nothing here ever needs
a paid plan. The subscription/IAP code (Apple/Google) is left in place
unused, in case this ever needs to support more than one merchant.

---

## الحصول على مفاتيح كل منصة وربط الحسابات

دليل تفصيلي لكل مفتاح/توكن مطلوب في `server/.env`، وكيفية ربط حساباتك
بالتطبيق في النهاية. كل الخطوات هنا مجانية بالكامل.

### 1. مفتاح Gemini (استخراج بيانات الطلب من الرسالة)
1. افتح https://aistudio.google.com/apikey وسجّل الدخول بحساب Google.
2. اضغط **Create API key**، واختر مشروع Google Cloud موجود أو دع Google
   ينشئ لك واحداً تلقائياً.
3. انسخ المفتاح وضعه في `GEMINI_API_KEY` داخل `server/.env`.
4. الحصة المجانية لـ Gemini 1.5 Flash كافية جداً لمتجر واحد بحجم استخدام عادي.

### 2. مفتاح Groq (تفريغ الرسائل الصوتية بالعربية)
1. افتح https://console.groq.com/keys وسجّل حساباً مجانياً.
2. اضغط **Create API Key** وانسخه إلى `GROQ_API_KEY`.
3. لا حاجة لبطاقة دفع؛ الحصة المجانية تكفي شخصاً واحداً.

### 3. واتساب (WhatsApp Cloud API)
1. أنشئ حساب Meta Business على https://business.facebook.com إن لم يكن لديك واحد.
2. اذهب إلى https://developers.facebook.com/apps → **Create App** → اختر
   نوع **Business**، وأعطه اسماً (مثلاً "Coco Love Bot").
3. من لوحة التطبيق، أضف منتج **WhatsApp**.
4. في صفحة إعداد واتساب ستجد رقم اختبار مجاني جاهز فوراً للتجربة (Test
   number)، أو يمكنك لاحقاً ربط رقم هاتف حقيقي (**Add phone number**) عبر
   التحقق برمز SMS.
5. انسخ **Phone number ID** الظاهر في نفس الصفحة → هذا هو
   `WHATSAPP_PHONE_NUMBER_ID`.
6. للحصول على توكن دائم (لا ينتهي كل 24 ساعة كالتوكن المؤقت الافتراضي):
   Meta Business Settings → **Users → System Users** → أنشئ System User
   جديد بدور Admin → من **Add Assets** أعطه صلاحية على تطبيقك → **Generate
   New Token** → اختر التطبيق وفعّل صلاحيتي
   `whatsapp_business_messaging` و`whatsapp_business_management` → انسخ
   التوكن الناتج إلى `WHATSAPP_ACCESS_TOKEN`.
7. من صفحة إعداد واتساب في developers.facebook.com → **Configuration →
   Webhook** → أدخل الرابط `https://your-domain.com/webhooks/whatsapp`
   وفي خانة **Verify token** أدخل نفس القيمة التي وضعتها في
   `WHATSAPP_VERIFY_TOKEN`، ثم اشترك في حقل **messages**.
8. من **App Settings → Basic**، اضغط **Show** أمام **App Secret** وانسخه
   إلى `META_APP_SECRET` (يُستخدم للتحقق من توقيع كل الويبهوكس القادمة من
   Meta: واتساب وانستغرام وماسنجر).

### 4. انستغرام (Instagram DM)
1. تأكد أن حسابك على انستغرام من نوع **حساب أعمال/مبدع (Professional
   account)**: من التطبيق على الهاتف → الإعدادات → نوع الحساب.
2. اربط الحساب بصفحة فيسبوك: من إعدادات صفحة فيسبوك → **Linked Accounts →
   Instagram** → اربط حسابك.
3. في نفس تطبيق Meta الذي أنشأته لواتساب، أضف منتج **Instagram**
   (Instagram Graph API / Messaging).
4. للحصول على `INSTAGRAM_PAGE_ID`: افتح **Graph API Explorer**
   (developers.facebook.com/tools/explorer) → اختر تطبيقك وحسابك → نفّذ
   `GET /me/accounts` للحصول على معرف صفحتك، ثم
   `GET /{page-id}?fields=instagram_business_account` للحصول على معرف
   حساب انستغرام المرتبط — هذا هو `INSTAGRAM_PAGE_ID`.
5. لـ `INSTAGRAM_ACCESS_TOKEN`: استخدم Page Access Token طويل الأمد لنفس
   الصفحة (يمكن توليده من System User كما في خطوة واتساب، بصلاحية
   `instagram_manage_messages` و`pages_show_list`).
6. Webhook: نفس الخطوات، الرابط `https://your-domain.com/webhooks/instagram`،
   Verify token = `INSTAGRAM_VERIFY_TOKEN`، اشترك في حقل **messages**.
7. بما أنك مالك التطبيق (Admin/Developer على تطبيق Meta)، يمكنك تجربته
   على حسابك الشخصي مباشرة دون انتظار مراجعة Meta (App Review) — المراجعة
   تلزم فقط إذا أردت لاحقاً تشغيله على حسابات عملاء آخرين غير أعضاء التطبيق.

### 5. ماسنجر (Facebook Messenger)
1. من نفس تطبيق Meta، أضف منتج **Messenger**.
2. في **Messenger API Settings**، اختر صفحتك من القائمة ثم اضغط
   **Generate Token** → هذا هو `MESSENGER_ACCESS_TOKEN`.
3. معرف الصفحة (`MESSENGER_PAGE_ID`) يظهر بجانب اسمها في نفس الصفحة، أو
   عبر `GET /me?fields=id` في Graph API Explorer.
4. Webhook: الرابط `https://your-domain.com/webhooks/messenger`، Verify
   token = `MESSENGER_VERIFY_TOKEN`، اشترك في حقل **messages**.

### 6. تيك توك (الأصعب نسبياً)
1. سجّل حساب مطوّر على https://developers.tiktok.com وأنشئ تطبيقاً جديداً.
2. اطلب الوصول إلى منتج المراسلة الخاص بتيك توك (يقع عادة تحت "TikTok for
   Business" أو برامج شراكة محددة) — على عكس Meta، الوصول لهذا المنتج
   ضيّق وغالباً يتطلب موافقة يدوية من تيك توك وقد يستغرق وقتاً، وربما
   يستلزم أن يكون حسابك التجاري معتمداً لديهم.
3. بعد القبول ستحصل على **Client Key** و**Client Secret** → ضعهما في
   `TIKTOK_CLIENT_KEY` و`TIKTOK_CLIENT_SECRET`.
4. معرف الحساب والتوكن (`TIKTOK_ACCOUNT_ID` / `TIKTOK_ACCESS_TOKEN`)
   يُنشآن عادة عبر تدفق OAuth (رابط تفويض يعيد توجيهك مع `code` تستبدله
   بتوكن) — شكل هذا التدفق يختلف حسب نوع الموافقة الممنوحة لحسابك، لذا لم
   يُؤتمت بالكامل هنا. اتركه فارغاً وفعّل بقية المنصات أولاً؛ عند حصولك
   على القبول من تيك توك، شارك التوثيق الفعلي المعطى لحسابك وسيتم ضبط
   `webhooks.js` وفقه بدقة.

### 7. ربط الحسابات بحسابك في التطبيق (خطوة أخيرة تجمع كل ما سبق)
1. افتح التطبيق (Expo) وسجّل حساباً (Sign up) بنفس البريد الذي ستضعه في
   `MERCHANT_EMAIL`.
2. عبّئ كل القيم أعلاه في `server/.env` (المعرفات + التوكنات لكل منصة
   استخدمتها فقط — لا حاجة لتعبئة الجميع).
3. من داخل مجلد `server` نفّذ:
   ```bash
   npm run link-channels
   ```
4. سيطبع لك سطراً لكل منصة رُبطت بنجاح. من هذه اللحظة، أي رسالة تصل لهذا
   الرقم/الصفحة/الحساب تُنسب تلقائياً لك، وتظهر مسودتها في تبويب "البائع
   الذكي" داخل التطبيق.
5. يمكنك إعادة تشغيل الأمر في أي وقت — مثلاً بعد تجديد توكن منتهي — فهو
   يحدّث السجل الموجود بدل تكراره.

### ملاحظات عامة
- السيرفر يحتاج رابط **HTTPS عام** يصل إليه Meta/TikTok فعلياً — لا يعمل
  مع `localhost`. للتجربة السريعة استخدم `ngrok http 8080` واستعمل الرابط
  الذي يعطيك إياه في كل حقول الـ Webhook أعلاه، أو انشر السيرفر على منصة
  مجانية/رخيصة مثل Render أو Railway أو Fly.io.
- توكن واتساب المؤقت (الذي يظهر افتراضياً أثناء التطوير) ينتهي كل 24
  ساعة — تجاهله بعد الحصول على التوكن الدائم عبر System User في الخطوة 6.
- لا حاجة لأي اشتراك مدفوع في Meta أو Google أو Groq لحساب تجاري واحد
  بحجم استخدام معتدل — كل ما سبق مجاني.

## Before this goes to a real customer

1. **Prisma**: run `npx prisma validate` and `npx prisma migrate dev` on a
   machine with normal internet access — this sandbox's network blocks the
   Prisma engine download, so the schema was checked structurally
   (balanced braces, valid model/enum names) but not through Prisma's own
   validator.
2. **Google Sign-In**: create an OAuth client in Google Cloud Console (iOS
   + Web types), drop the client IDs into both `.env` files.
3. **Sign in with Apple**: enable the capability in your Apple Developer
   account for the bundle id `com.cocolove.orders`. Required by App Store
   review the moment any other social login is offered (Guideline 4.8).
4. **In-app purchases**: create the 6 subscription products in App Store
   Connect (and Google Play Console) with IDs matching
   `mobile/src/config.js` → `IAP_SKUS` exactly. Generate an App Store
   Server API key (Users and Access → Integrations → In-App Purchase) for
   `server/.env` → `APPLE_*`.
5. **Database**: any managed Postgres works (Railway, Supabase, RDS...).
6. **Deploy the server** somewhere with a stable HTTPS URL, then point
   `EXPO_PUBLIC_API_URL` at it before building the app for TestFlight.

## Security measures already in place

- Passwords hashed with bcrypt (cost 12), never stored or logged in plain text
- Access tokens are short-lived (15 min); refresh tokens rotate on every
  use and a reused/stolen token revokes the whole session family
- Refresh tokens are stored hashed (SHA-256) in the database — a DB leak
  doesn't hand out usable tokens
- Google and Apple identity tokens are verified against Google/Apple's own
  servers — the app never just "trusts" what the device claims
- Subscription entitlement is granted only after the **server** verifies
  the purchase receipt directly with Apple/Google — a modified client
  cannot unlock a paid plan for itself
- Order quota is enforced inside a database transaction, closing the race
  condition where two simultaneous requests could both slip past the limit
- All input validated with zod before it touches the database
- Rate limiting: 20 req/15min on auth endpoints, 120 req/min globally
- CORS locked to an explicit origin allowlist
- `helmet` sets standard hardening headers (HSTS, no-sniff, frameguard, etc.)
- Tokens live in the iOS Keychain / Android Keystore (`expo-secure-store`),
  never in plain-text storage
- Optional Face ID / Touch ID app-lock, re-armed whenever the app returns
  from the background
- Every DB query is scoped to `req.user.id` — no endpoint can return or
  modify another merchant's orders

## What still needs your judgment

- Apple's receipt JWS is decoded but not fully chain-verified against
  Apple's root CA in this scaffold — swap in Apple's official
  `app-store-server-library` npm package before going live.
- Add structured logging/alerting (e.g. Sentry) — errors currently only
  go to stdout.
- Add a WAF or Cloudflare in front of the API for DDoS protection.
