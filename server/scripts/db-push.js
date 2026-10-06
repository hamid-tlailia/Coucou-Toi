// Vercel build step: creates/updates the database tables. Uses the direct
// (non-pooled) connection when the Neon integration provides one. Skips
// cleanly when no database is connected yet, so the first deploy succeeds.
const { execSync } = require('child_process');

const url = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!url) {
  console.warn('⚠️  No DATABASE_URL yet — skipping prisma db push. Connect a database and redeploy.');
  process.exit(0);
}
execSync('npx prisma db push --skip-generate', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } });
