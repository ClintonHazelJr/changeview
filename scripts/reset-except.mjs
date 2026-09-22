/**
 * Platform reset: keep one email; delete every other account, app user,
 * Auth login, and Stripe customer.
 *
 * Usage:
 *   npm run reset-except -- --confirm
 *   npm run reset-except -- --dry-run
 *   npm run reset-except -- --confirm --email=you@example.com
 *
 * Env (required for real run):
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   STRIPE_SECRET_KEY (optional but recommended)
 *   PLATFORM_ADMIN_EMAIL (optional; default clintonhazeljr@gmail.com)
 *
 * Prefer: npx vercel env run --environment production -- npm run reset-except -- --confirm
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_PLATFORM_ADMIN_EMAIL,
  RESET_CONFIRM_PHRASE,
  runPlatformReset,
} from '../api/_platformReset.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv(path) {
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const i = trimmed.indexOf('=');
      if (i < 0) continue;
      const key = trimmed.slice(0, i);
      let val = trimmed.slice(i + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      val = val.trim();
      if (!val || val === '[SENSITIVE]') continue;
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // optional
  }
}

loadEnv(join(ROOT, '.env.vercel.local'));
loadEnv(join(ROOT, '.env.local'));

function parseArgs(argv) {
  const out = { confirm: false, dryRun: false, email: null };
  for (const arg of argv) {
    if (arg === '--confirm') out.confirm = true;
    else if (arg === '--dry-run') out.dryRun = true;
    else if (arg.startsWith('--email=')) out.email = arg.slice('--email='.length).trim();
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const keepEmail = (args.email || process.env.PLATFORM_ADMIN_EMAIL || DEFAULT_PLATFORM_ADMIN_EMAIL)
  .trim()
  .toLowerCase();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !/^https?:\/\//i.test(url) || !serviceKey || serviceKey === '[SENSITIVE]') {
  console.error('Missing real SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Run via: npx vercel env run --environment production -- npm run reset-except -- --confirm');
  process.exit(1);
}

if (!args.confirm && !args.dryRun) {
  console.error('Refusing to run without --confirm or --dry-run.');
  console.error(`This deletes every account/user/Auth/Stripe customer except ${keepEmail}.`);
  console.error(`Confirm phrase (API/UI): ${RESET_CONFIRM_PHRASE}`);
  console.error('');
  console.error('  npm run reset-except -- --dry-run');
  console.error('  npm run reset-except -- --confirm');
  process.exit(1);
}

// --confirm always performs a real delete; --dry-run alone is preview-only.
const dryRun = !args.confirm && args.dryRun;
if (args.confirm && args.dryRun) {
  console.log('Note: --confirm wins over --dry-run (performing real delete).\n');
}

try {
  const summary = await runPlatformReset({
    keepEmail,
    dryRun,
    log: console.log,
  });
  console.log('\nSummary:', {
    dryRun,
    keepEmail,
    deletedAccounts: summary.deletedAccounts.length,
    deletedAuthUsers: summary.deletedAuthUsers.length,
    deletedAppUsers: summary.deletedAppUsers.length,
    deletedStripeCustomers: summary.deletedStripeCustomers.length,
    errors: summary.errors,
  });
  if (summary.errors?.length) process.exit(2);
} catch (err) {
  console.error(err);
  process.exit(1);
}
