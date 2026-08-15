/**
 * One-off: keep clintonhazeljr@gmail.com; purge other app accounts,
 * Auth users, and Stripe customers/subscriptions.
 * Run: node scripts/purge-except-owner.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const KEEP_EMAIL = 'clintonhazeljr@gmail.com';
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
      // Skip Vercel CLI redacted placeholders
      if (!val || val === '[SENSITIVE]') continue;
      process.env[key] = val;
    }
  } catch {
    // optional file
  }
}

// Prefer real process env (e.g. `vercel env run`); only fill gaps from local files.
loadEnv(join(ROOT, '.env.vercel.local'));
loadEnv(join(ROOT, '.env.local'));

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!url || !/^https?:\/\//i.test(url) || !serviceKey || serviceKey === '[SENSITIVE]' || !stripeKey || stripeKey === '[SENSITIVE]') {
  console.error('Missing real SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / STRIPE_SECRET_KEY.');
  console.error('Run via: npx vercel env run --environment production -- node scripts/purge-except-owner.mjs');
  console.error('Debug:', {
    urlOk: Boolean(url && /^https?:\/\//i.test(url)),
    serviceKeyLen: serviceKey?.length,
    stripeKeyLen: stripeKey?.length,
    urlStart: url?.slice(0, 12),
  });
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const stripe = new Stripe(stripeKey, { apiVersion: '2025-03-31.basil' });

const log = (...args) => console.log(...args);
const keep = KEEP_EMAIL.toLowerCase();

async function listAllAuthUsers() {
  const out = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    out.push(...(data?.users || []));
    if (!data?.users?.length || data.users.length < 200) break;
    page += 1;
  }
  return out;
}

async function cancelAndDeleteStripeCustomer(customerId, reason) {
  if (!customerId) return { skipped: true };
  try {
    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
    for (const sub of subs.data) {
      if (['canceled', 'incomplete_expired'].includes(sub.status)) continue;
      try {
        await stripe.subscriptions.cancel(sub.id);
        log(`  Stripe: canceled sub ${sub.id} (${sub.status})`);
      } catch (err) {
        log(`  Stripe: cancel sub ${sub.id} failed: ${err.message}`);
      }
    }
    await stripe.customers.del(customerId);
    log(`  Stripe: deleted customer ${customerId} (${reason})`);
    return { deleted: true };
  } catch (err) {
    if (err?.code === 'resource_missing') {
      log(`  Stripe: customer ${customerId} already gone`);
      return { missing: true };
    }
    log(`  Stripe: customer ${customerId} error: ${err.message}`);
    return { error: err.message };
  }
}

async function wipeAccount(accountId) {
  await admin.from('users').update({ default_workspace_id: null }).eq('account_id', accountId);
  const { error } = await admin.from('workspaces').delete().eq('account_id', accountId);
  if (error) throw new Error(error.message);
}

async function main() {
  log(`Mode: Stripe key starts with ${stripeKey.slice(0, 7)}…`);
  log(`Keep: ${KEEP_EMAIL}\n`);

  const { data: appUsers, error: usersErr } = await admin
    .from('users')
    .select('id, email, account_id, role, is_active');
  if (usersErr) throw usersErr;

  const keepUser = (appUsers || []).find((u) => String(u.email || '').toLowerCase() === keep);
  if (!keepUser) {
    console.error(`Keep user ${KEEP_EMAIL} not found in public.users — aborting.`);
    process.exit(1);
  }
  const keepAccountId = keepUser.account_id;
  log(`Keep user id=${keepUser.id} account=${keepAccountId}`);

  const { data: keepSub } = await admin
    .from('subscriptions')
    .select('*')
    .eq('account_id', keepAccountId)
    .maybeSingle();
  log('Keep subscription:', JSON.stringify(keepSub, null, 2));
  const keepStripeCustomerId = keepSub?.stripe_customer_id || null;

  const accountIds = [...new Set((appUsers || []).map((u) => u.account_id).filter(Boolean))];
  const toDeleteAccounts = accountIds.filter((id) => id !== keepAccountId);
  log(`\nAccounts to delete: ${toDeleteAccounts.length}`);

  for (const accountId of toDeleteAccounts) {
    const members = (appUsers || []).filter((u) => u.account_id === accountId);
    log(`\nAccount ${accountId} members: ${members.map((m) => m.email).join(', ') || '(none)'}`);

    const { data: sub } = await admin
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status')
      .eq('account_id', accountId)
      .maybeSingle();

    if (sub?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
        log(`  Stripe: canceled ${sub.stripe_subscription_id}`);
      } catch (err) {
        log(`  Stripe: cancel ${sub.stripe_subscription_id}: ${err.message}`);
      }
    }
    if (sub?.stripe_customer_id && sub.stripe_customer_id !== keepStripeCustomerId) {
      await cancelAndDeleteStripeCustomer(sub.stripe_customer_id, 'account wipe');
    }

    try {
      await wipeAccount(accountId);
      log('  Wiped workspaces');
    } catch (err) {
      log(`  Wipe failed: ${err.message}`);
    }

    for (const m of members) {
      const { error: delAuthErr } = await admin.auth.admin.deleteUser(m.id);
      if (delAuthErr) log(`  Auth delete ${m.email}: ${delAuthErr.message}`);
      else log(`  Auth deleted ${m.email}`);
    }

    const { error: delAccErr } = await admin.from('accounts').delete().eq('id', accountId);
    if (delAccErr) log(`  Account delete failed: ${delAccErr.message}`);
    else log('  Account row deleted');
  }

  // Orphan Auth users (no keep email)
  log('\nScanning Auth users…');
  const authUsers = await listAllAuthUsers();
  for (const u of authUsers) {
    const email = String(u.email || '').toLowerCase();
    if (!email || email === keep) continue;
    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (error) log(`  Orphan auth delete ${email}: ${error.message}`);
    else log(`  Orphan auth deleted ${email}`);
  }

  // Stripe customers not belonging to keep email / keep customer id
  log('\nScanning Stripe customers…');
  let startingAfter;
  let stripeKept = 0;
  let stripeDeleted = 0;
  for (;;) {
    const page = await stripe.customers.list({ limit: 100, starting_after: startingAfter });
    for (const c of page.data) {
      const email = String(c.email || '').toLowerCase();
      const isKeep = c.id === keepStripeCustomerId || email === keep;
      if (isKeep) {
        stripeKept += 1;
        log(`  KEEP customer ${c.id} email=${c.email || '(none)'}`);
        continue;
      }
      await cancelAndDeleteStripeCustomer(c.id, `email=${c.email || 'none'}`);
      stripeDeleted += 1;
    }
    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  // Final report
  log('\n=== FINAL STATE ===');
  const { data: remainingUsers } = await admin.from('users').select('id, email, account_id, role');
  const { data: remainingAccounts } = await admin.from('accounts').select('id, name, deleted_at');
  const remainingAuth = await listAllAuthUsers();
  const remainingCustomers = [];
  startingAfter = undefined;
  for (;;) {
    const page = await stripe.customers.list({ limit: 100, starting_after: startingAfter });
    remainingCustomers.push(...page.data);
    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  log('App users:', remainingUsers);
  log('Accounts:', remainingAccounts);
  log('Auth users:', remainingAuth.map((u) => ({ id: u.id, email: u.email })));
  log('Stripe customers:', remainingCustomers.map((c) => ({ id: c.id, email: c.email })));
  log(`Stripe customers kept/deleted this run: kept=${stripeKept} deleted=${stripeDeleted}`);

  if (keepStripeCustomerId) {
    const cust = await stripe.customers.retrieve(keepStripeCustomerId);
    const subs = await stripe.subscriptions.list({ customer: keepStripeCustomerId, status: 'all', limit: 20 });
    log('\nKeep Stripe customer:', { id: cust.id, email: cust.email, deleted: cust.deleted });
    log('Keep Stripe subscriptions:', subs.data.map((s) => ({
      id: s.id,
      status: s.status,
      trial_end: s.trial_end,
      items: s.items?.data?.map((i) => i.price?.id),
    })));
  } else {
    log('\nKeep account has no stripe_customer_id in subscriptions table.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
