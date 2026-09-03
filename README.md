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
