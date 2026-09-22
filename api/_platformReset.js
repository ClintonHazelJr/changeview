import { createClient } from '@supabase/supabase-js';
import { wipeAccountWorkspaces } from './_accountWipe.js';
import { createStripeClient } from './_stripeClient.js';

/** Default keep-email when PLATFORM_ADMIN_EMAIL is unset. */
export const DEFAULT_PLATFORM_ADMIN_EMAIL = 'clintonhazeljr@gmail.com';

export const RESET_CONFIRM_PHRASE = 'RESET ALL EXCEPT ME';

export function platformAdminEmail() {
  return String(process.env.PLATFORM_ADMIN_EMAIL || DEFAULT_PLATFORM_ADMIN_EMAIL).trim().toLowerCase();
}

export function isPlatformAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === platformAdminEmail();
}

function adminFromEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function listAllAuthUsers(admin) {
  const out = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const batch = data?.users || [];
    out.push(...batch);
    if (batch.length < 200) break;
    page += 1;
  }
  return out;
}

async function cancelAndDeleteStripeCustomer(stripe, customerId, log) {
  if (!customerId) return;
  try {
    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
    for (const sub of subs.data) {
      if (['canceled', 'incomplete_expired'].includes(sub.status)) continue;
      try {
        await stripe.subscriptions.cancel(sub.id);
        log(`  Stripe: canceled sub ${sub.id}`);
      } catch (err) {
        log(`  Stripe: cancel sub ${sub.id}: ${err.message}`);
      }
    }
    await stripe.customers.del(customerId);
    log(`  Stripe: deleted customer ${customerId}`);
  } catch (err) {
    if (err?.code === 'resource_missing') {
      log(`  Stripe: customer ${customerId} already gone`);
      return;
    }
    log(`  Stripe: customer ${customerId}: ${err.message}`);
  }
}

function uniq(list) {
  return [...new Set(list.filter(Boolean))];
}

/**
 * Hard-delete every account / user / auth login / extra Stripe customer
 * except the keep email's account + login. Keep-account workspaces stay.
 *
 * @param {{ keepEmail: string, log?: (msg: string) => void, dryRun?: boolean }} opts
 */
export async function runPlatformReset({
  keepEmail,
  log = console.log,
  dryRun = false,
} = {}) {
  const keep = String(keepEmail || '').trim().toLowerCase();
  if (!keep || !keep.includes('@')) {
    throw new Error('keepEmail must be a valid email');
  }

  const admin = adminFromEnv();
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const stripe = stripeKey ? createStripeClient(stripeKey) : null;

  const summary = {
    keepEmail: keep,
    dryRun,
    deletedAccounts: [],
    deletedAuthUsers: [],
    deletedAppUsers: [],
    deletedStripeCustomers: [],
    kept: {},
    errors: [],
  };

  const { data: appUsers, error: usersErr } = await admin
    .from('users')
    .select('id, email, account_id, role, is_active');
  if (usersErr) throw new Error(usersErr.message);

  const keepUser = (appUsers || []).find((u) => String(u.email || '').toLowerCase() === keep);
  if (!keepUser) {
    throw new Error(`Keep user ${keep} not found in public.users — aborting (nothing deleted).`);
  }
  const keepAccountId = keepUser.account_id;
  summary.kept = { userId: keepUser.id, accountId: keepAccountId };

  const { data: keepSub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, status, plan_tier')
    .eq('account_id', keepAccountId)
    .maybeSingle();
  const keepStripeCustomerId = keepSub?.stripe_customer_id || null;
  summary.kept.subscription = keepSub || null;
  summary.kept.stripeCustomerId = keepStripeCustomerId;

  log(`Keep ${keep} → user=${keepUser.id} account=${keepAccountId}`);
  if (dryRun) log('DRY RUN — no deletes will be performed.');

  // --- Other accounts ---
  const { data: allAccounts, error: accErr } = await admin.from('accounts').select('id, name, deleted_at');
  if (accErr) throw new Error(accErr.message);

  const otherAccounts = (allAccounts || []).filter((a) => a.id !== keepAccountId);
  log(`Accounts to delete: ${otherAccounts.length}`);

  for (const account of otherAccounts) {
    const members = (appUsers || []).filter((u) => u.account_id === account.id);
    log(`\nAccount ${account.id} (${account.name || 'unnamed'}) members: ${members.map((m) => m.email).join(', ') || '(none)'}`);

    const { data: sub } = await admin
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('account_id', account.id)
      .maybeSingle();

    if (!dryRun) {
      if (stripe && sub?.stripe_subscription_id) {
        try {
          await stripe.subscriptions.cancel(sub.stripe_subscription_id);
          log(`  Stripe: canceled ${sub.stripe_subscription_id}`);
        } catch (err) {
          log(`  Stripe: cancel ${sub.stripe_subscription_id}: ${err.message}`);
        }
      }
      if (stripe && sub?.stripe_customer_id && sub.stripe_customer_id !== keepStripeCustomerId) {
        await cancelAndDeleteStripeCustomer(stripe, sub.stripe_customer_id, log);
        summary.deletedStripeCustomers.push(sub.stripe_customer_id);
      }

      try {
        await wipeAccountWorkspaces(admin, account.id);
        log('  Wiped workspaces');
      } catch (err) {
        summary.errors.push(`wipe ${account.id}: ${err.message}`);
        log(`  Wipe failed: ${err.message}`);
      }

      for (const m of members) {
        const { error: delAuthErr } = await admin.auth.admin.deleteUser(m.id);
        if (delAuthErr) {
          summary.errors.push(`auth ${m.email}: ${delAuthErr.message}`);
          log(`  Auth delete ${m.email}: ${delAuthErr.message}`);
        } else {
          summary.deletedAuthUsers.push(m.email);
          log(`  Auth deleted ${m.email}`);
        }
      }

      const { error: delAccErr } = await admin.from('accounts').delete().eq('id', account.id);
      if (delAccErr) {
        summary.errors.push(`account ${account.id}: ${delAccErr.message}`);
        log(`  Account delete failed: ${delAccErr.message}`);
      } else {
        summary.deletedAccounts.push(account.id);
        log('  Account row deleted');
      }
    } else {
      log('  (dry-run) would wipe workspaces, auth users, account, stripe');
      summary.deletedAccounts.push(account.id);
      members.forEach((m) => summary.deletedAuthUsers.push(m.email));
    }
  }

  // --- Extra members on keep account ---
  const extraOnKeep = (appUsers || []).filter(
    (u) => u.account_id === keepAccountId && String(u.email || '').toLowerCase() !== keep,
  );
  if (extraOnKeep.length) {
    log(`\nRemoving ${extraOnKeep.length} extra user(s) on keep account…`);
    for (const m of extraOnKeep) {
      if (dryRun) {
        summary.deletedAppUsers.push(m.email);
        summary.deletedAuthUsers.push(m.email);
        log(`  (dry-run) would remove ${m.email}`);
        continue;
      }
      const { error: delAuthErr } = await admin.auth.admin.deleteUser(m.id);
      if (delAuthErr) {
        summary.errors.push(`auth ${m.email}: ${delAuthErr.message}`);
        log(`  Auth delete ${m.email}: ${delAuthErr.message}`);
      } else {
        summary.deletedAuthUsers.push(m.email);
        log(`  Auth deleted ${m.email}`);
      }
      const { error: delUserErr } = await admin.from('users').delete().eq('id', m.id);
      if (delUserErr) {
        // Auth delete may cascade; ignore missing row
        log(`  App user delete ${m.email}: ${delUserErr.message}`);
      } else {
        summary.deletedAppUsers.push(m.email);
        log(`  App user deleted ${m.email}`);
      }
    }
  }

  // --- Orphan Auth users ---
  log('\nScanning Auth users…');
  const authUsers = await listAllAuthUsers(admin);
  for (const u of authUsers) {
    const email = String(u.email || '').toLowerCase();
    if (!email || email === keep) continue;
    if (dryRun) {
      summary.deletedAuthUsers.push(email);
      log(`  (dry-run) would delete auth ${email}`);
      continue;
    }
    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (error) {
      summary.errors.push(`orphan auth ${email}: ${error.message}`);
      log(`  Orphan auth delete ${email}: ${error.message}`);
    } else {
      summary.deletedAuthUsers.push(email);
      log(`  Orphan auth deleted ${email}`);
    }
  }

  // --- Stripe sweep ---
  if (stripe) {
    log('\nScanning Stripe customers…');
    let startingAfter;
    for (;;) {
      const page = await stripe.customers.list({
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const c of page.data) {
        const email = String(c.email || '').toLowerCase();
        const isKeep = c.id === keepStripeCustomerId || email === keep;
        if (isKeep) {
          log(`  KEEP customer ${c.id} email=${c.email || '(none)'}`);
          continue;
        }
        if (dryRun) {
          summary.deletedStripeCustomers.push(c.id);
          log(`  (dry-run) would delete Stripe ${c.id} email=${c.email || 'none'}`);
          continue;
        }
        await cancelAndDeleteStripeCustomer(stripe, c.id, log);
        summary.deletedStripeCustomers.push(c.id);
      }
      if (!page.has_more) break;
      startingAfter = page.data[page.data.length - 1].id;
    }
  } else {
    log('\nNo STRIPE_SECRET_KEY — skipped Stripe sweep.');
  }

  // --- Final snapshot ---
  const { data: remainingUsers } = await admin.from('users').select('id, email, account_id, role');
  const { data: remainingAccounts } = await admin.from('accounts').select('id, name, deleted_at');
  const remainingAuth = await listAllAuthUsers(admin);
  summary.remaining = {
    users: remainingUsers || [],
    accounts: remainingAccounts || [],
    auth: remainingAuth.map((u) => ({ id: u.id, email: u.email })),
  };

  summary.deletedAccounts = uniq(summary.deletedAccounts);
  summary.deletedAuthUsers = uniq(summary.deletedAuthUsers);
  summary.deletedAppUsers = uniq(summary.deletedAppUsers);
  summary.deletedStripeCustomers = uniq(summary.deletedStripeCustomers);

  log('\n=== FINAL STATE ===');
  log('App users:', summary.remaining.users);
  log('Accounts:', summary.remaining.accounts);
  log('Auth users:', summary.remaining.auth);

  return summary;
}
