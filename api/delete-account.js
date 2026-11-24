import { adminClient, setCors, requireAccountOwner, banAuthUser } from './_adminAuth.js';
import { wipeAccountWorkspaces } from './_accountWipe.js';
import { createStripeClient } from './_stripeClient.js';

/**
 * Owner-only account deletion. Strict order:
 *   1) Confirm Stripe subscription is cancelled (or already gone)
 *   2) Mirror cancelled status in our subscriptions row
 *   3) Ban every Auth user (Admin API — no users.is_active toggle)
 *   4) Soft-delete account (accounts.deleted_at)
 *   5) Wipe workspaces
 *
 * Billing must be dead before we destroy app access. If Stripe cancel fails,
 * we abort — never leave a live subscription charging after the account is gone.
 *
 * Body: { confirm: 'DELETE' }
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = adminClient();
  if (!admin) {
    return res.status(500).json({ error: 'Service not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const { caller, error: authError } = await requireAccountOwner(admin, req);
  if (authError) return res.status(authError.status).json({ error: authError.message });

  const confirm = String(req.body?.confirm || '').trim();

  const { data: account } = await admin
    .from('accounts')
    .select('id, name, deleted_at')
    .eq('id', caller.account_id)
    .maybeSingle();
  if (!account) return res.status(404).json({ error: 'Account not found' });
  if (account.deleted_at) {
    return res.status(200).json({ ok: true, alreadyDeleted: true });
  }
  if (confirm !== 'DELETE' && confirm !== account.name) {
    return res.status(400).json({ error: 'Type DELETE (or your exact account name) to confirm' });
  }

  const { data: sub, error: subLoadErr } = await admin
    .from('subscriptions')
    .select('stripe_subscription_id, stripe_customer_id, status')
    .eq('account_id', caller.account_id)
    .maybeSingle();
  if (subLoadErr) {
    return res.status(500).json({ error: subLoadErr.message || 'Could not load subscription' });
  }

  const hasBillingIds = Boolean(sub?.stripe_subscription_id || sub?.stripe_customer_id);
  const looksBillable = hasBillingIds
    || ['trialing', 'active', 'past_due', 'incomplete'].includes(String(sub?.status || ''));

  // ——— 1) Stripe cancel FIRST and confirm success before any Auth/soft-delete ———
  if (looksBillable) {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: 'Stripe is not configured; cannot cancel billing before deleting the account.',
      });
    }

    try {
      const stripe = createStripeClient(process.env.STRIPE_SECRET_KEY);
      const cancelResult = await cancelStripeBilling(stripe, {
        subscriptionId: sub?.stripe_subscription_id || null,
        customerId: sub?.stripe_customer_id || null,
        accountId: caller.account_id,
      });
      console.info('[delete-account] Stripe billing cancelled', cancelResult);
    } catch (err) {
      console.error('[delete-account] Stripe cancel failed — aborting deletion', {
        accountId: caller.account_id,
        message: err.message,
      });
      return res.status(502).json({
        error: err.message || 'Could not cancel Stripe subscription. Account was not deleted.',
      });
    }
  } else {
    console.info('[delete-account] no Stripe billing ids/status — skipping Stripe cancel', {
      accountId: caller.account_id,
      status: sub?.status || null,
    });
  }

  // ——— 2) Mirror cancelled in DB (only after Stripe confirmed) ———
  if (sub) {
    const { error: subErr } = await admin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        trial_ends_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', caller.account_id);
    if (subErr) {
      // Billing is already dead in Stripe; log and continue so the account can still be removed.
      console.error('[delete-account] local subscription status update failed after Stripe cancel', {
        accountId: caller.account_id,
        message: subErr.message,
      });
    }
  }

  // ——— 3) Ban every Auth user (Admin API). Do NOT flip users.is_active. ———
  const { data: users, error: usersErr } = await admin
    .from('users')
    .select('id, email')
    .eq('account_id', caller.account_id);
  if (usersErr) {
    return res.status(500).json({ error: usersErr.message || 'Could not list users' });
  }
  if (!users?.length) {
    console.error('[delete-account] no users found for account', caller.account_id);
    return res.status(500).json({ error: 'No users found on this account to ban' });
  }

  const banFailures = [];
  for (const u of users) {
    const { error: banErr, bannedUntil } = await banAuthUser(admin, u.id);
    if (banErr) {
      banFailures.push({
        userId: u.id,
        email: u.email,
        message: banErr.message || 'Failed to ban auth user',
      });
      continue;
    }
    console.info('[delete-account] banned auth user', {
      userId: u.id,
      email: u.email,
      bannedUntil,
    });
  }

  if (banFailures.length > 0) {
    console.error('[delete-account] Auth ban step failed; aborting before soft-delete', {
      accountId: caller.account_id,
      failures: banFailures,
      note: 'Stripe billing was already cancelled if present',
    });
    return res.status(500).json({
      error: `Could not ban ${banFailures.length} user(s) in Auth. Account was not soft-deleted. Billing was cancelled if a Stripe subscription existed.`,
      banFailures,
      stripeCancelled: looksBillable,
    });
  }

  // ——— 4) Soft-delete account ———
  const { error: clearWsErr } = await admin
    .from('users')
    .update({ default_workspace_id: null })
    .eq('account_id', caller.account_id);
  if (clearWsErr) {
    console.warn('[delete-account] could not clear default_workspace_id (continuing)', {
      accountId: caller.account_id,
      message: clearWsErr.message,
    });
  }

  const { error: delErr } = await admin
    .from('accounts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', caller.account_id);
  if (delErr) {
    return res.status(500).json({
      error: delErr.message || 'Could not mark account deleted',
      stripeCancelled: looksBillable,
      banned: true,
    });
  }

  // ——— 5) Wipe workspace content ———
  try {
    await wipeAccountWorkspaces(admin, caller.account_id);
  } catch (err) {
    console.error('[delete-account] workspace wipe failed after soft-delete', {
      accountId: caller.account_id,
      message: err.message,
    });
    return res.status(500).json({
      error: err.message || 'Account was deleted and users banned, but data wipe failed',
      banned: true,
      deleted: true,
      stripeCancelled: looksBillable,
    });
  }

  return res.status(200).json({
    ok: true,
    bannedUserIds: users.map((u) => u.id),
    stripeCancelled: looksBillable,
  });
}

/**
 * Cancel the known subscription id, then any remaining non-terminal subs on the customer.
 * Throws unless every relevant subscription is canceled / already gone.
 */
async function cancelStripeBilling(stripe, { subscriptionId, customerId, accountId }) {
  const canceledIds = [];
  const alreadyGone = [];

  async function cancelOne(id, reason) {
    try {
      const canceled = await stripe.subscriptions.cancel(id);
      const status = canceled?.status || null;
      console.info('[delete-account] stripe.subscriptions.cancel', {
        accountId,
        subscriptionId: id,
        status,
        reason,
      });
      if (status && !['canceled', 'incomplete_expired'].includes(status)) {
        throw new Error(`Stripe subscription ${id} status after cancel is "${status}", expected canceled`);
      }
      canceledIds.push(id);
      return canceled;
    } catch (err) {
      const msg = String(err?.message || '');
      const code = err?.code || err?.raw?.code;
      if (code === 'resource_missing' || /no such subscription/i.test(msg) || /already canceled/i.test(msg)) {
        alreadyGone.push(id);
        console.info('[delete-account] Stripe subscription already gone', { accountId, subscriptionId: id, msg });
        return null;
      }
      throw new Error(msg || `Could not cancel Stripe subscription ${id}`);
    }
  }

  if (subscriptionId) {
    await cancelOne(subscriptionId, 'subscriptions.stripe_subscription_id');
  }

  if (customerId) {
    const page = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });
    for (const s of page.data || []) {
      if (['canceled', 'incomplete_expired'].includes(s.status)) continue;
      if (canceledIds.includes(s.id) || alreadyGone.includes(s.id)) continue;
      await cancelOne(s.id, `customer ${customerId} sweep`);
    }
  }

  if (subscriptionId) {
    try {
      const verified = await stripe.subscriptions.retrieve(subscriptionId);
      if (verified && !['canceled', 'incomplete_expired'].includes(verified.status)) {
        throw new Error(
          `Stripe subscription ${subscriptionId} still "${verified.status}" after cancel attempt`,
        );
      }
    } catch (err) {
      const msg = String(err?.message || '');
      const code = err?.code || err?.raw?.code;
      if (code === 'resource_missing' || /no such subscription/i.test(msg)) {
        // Confirmed gone.
      } else if (/still "/i.test(msg)) {
        throw err;
      } else {
        throw new Error(msg || `Could not verify Stripe subscription ${subscriptionId} after cancel`);
      }
    }
  }

  return { canceledIds, alreadyGone, customerId: customerId || null };
}
