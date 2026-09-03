require('dotenv').config();
const { prisma } = require('../src/lib/db');

/**
 * One-time (and re-runnable) setup for a single-merchant deployment: reads
 * the channel ids + access tokens from .env and links them to your own
 * account, so incoming webhooks know every message belongs to you.
 * Safe to re-run any time a token is refreshed — it upserts, never duplicates.
 *
 * Usage: fill the relevant *_ID / *_ACCESS_TOKEN vars in .env (see
 * .env.example and the README section "الحصول على مفاتيح كل منصة وربط
 * الحسابات"), sign up in the app first so your user row exists, set
 * MERCHANT_EMAIL to that account's email, then run:
 *   npm run link-channels
 */
const CHANNELS = [
  { channel: 'whatsapp', idVar: 'WHATSAPP_PHONE_NUMBER_ID', tokenVar: 'WHATSAPP_ACCESS_TOKEN' },
  { channel: 'instagram', idVar: 'INSTAGRAM_PAGE_ID', tokenVar: 'INSTAGRAM_ACCESS_TOKEN' },
  { channel: 'facebook', idVar: 'MESSENGER_PAGE_ID', tokenVar: 'MESSENGER_ACCESS_TOKEN' },
  { channel: 'tiktok', idVar: 'TIKTOK_ACCOUNT_ID', tokenVar: 'TIKTOK_ACCESS_TOKEN' },
];

async function main() {
  const email = process.env.MERCHANT_EMAIL;
  if (!email) {
    throw new Error('Set MERCHANT_EMAIL in server/.env to the email you signed up with in the app, then re-run.');
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`No account found for ${email} — open the app and sign up first, then re-run this script.`);
  }

  let linked = 0;
  for (const { channel, idVar, tokenVar } of CHANNELS) {
    const externalId = process.env[idVar];
    if (!externalId) {
      console.log(`- skipping ${channel}: ${idVar} not set in .env`);
      continue;
    }
    await prisma.channelAccount.upsert({
      where: { channel_externalId: { channel, externalId } },
      create: { userId: user.id, channel, externalId, accessToken: process.env[tokenVar] || null },
      update: { userId: user.id, accessToken: process.env[tokenVar] || null },
    });
    console.log(`✓ linked ${channel} (${idVar}=${externalId}) to ${email}`);
    linked++;
  }

  if (linked === 0) {
    console.log('\nNothing linked — fill in at least one *_ID variable in .env first.');
  } else {
    console.log(`\nDone. ${linked} channel(s) now route to your account.`);
  }
}

main()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
