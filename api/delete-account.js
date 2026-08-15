import { adminClient, setCors, requireAccountOwner, banAuthUser } from './_adminAuth.js';
import { wipeAccountWorkspaces } from './_accountWipe.js';
import { createStripeClient } from './_stripeClient.js';

/**
 * Owner-only: cancel Stripe, ban all Auth users, soft-delete account, wipe workspaces.
 * Body: { confirm: 'DELETE' }
 *
 * Dedicated deletion path — does not flip users.is_active (that path's last-owner
 * safeguard is for /api/deactivate-user only). Login lockout is Auth ban + accounts.deleted_at.
 *
 * Auth bans must succeed before soft-delete. The Admin API returns { error }
 * rather than throwing — always check that field.
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

  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_subscription_id, status')
    .eq('account_id', caller.account_id)
    .maybeSingle();

  // 1) Cancel Stripe subscription (if any).
  if (sub?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = createStripeClient(process.env.STRIPE_SECRET_KEY);
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    } catch (err) {
      const msg = String(err?.message || '');
      const code = err?.code || err?.raw?.code;
      if (code !== 'resource_missing' && !/no such subscription/i.test(msg) && !/already canceled/i.test(msg)) {
        return res.status(502).json({ error: msg || 'Could not cancel Stripe subscription' });
      }
    }
  }

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
      console.error('[delete-account] subscription status update failed', subErr.message);
    }
  }

  // 2) Ban every Auth user on the account via Admin API — must succeed before soft-delete.
  // Do NOT flip users.is_active here: the last-owner safeguard on that column is for
  // per-user deactivation (/api/deactivate-user), not whole-account deletion.
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
    });
    return res.status(500).json({
      error: `Could not ban ${banFailures.length} user(s) in Auth. Account was not soft-deleted.`,
      banFailures,
    });
  }

  // 3) Clear default workspace pointers only (no is_active — avoids only-owner trigger).
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

  // 4) Soft-delete the account (AuthContext treats deleted_at as signed-out).
  const { error: delErr } = await admin
    .from('accounts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', caller.account_id);
  if (delErr) {
    return res.status(500).json({ error: delErr.message || 'Could not mark account deleted' });
  }

  // 5) Wipe all workspace content.
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
    });
  }

  return res.status(200).json({
    ok: true,
    bannedUserIds: users.map((u) => u.id),
  });
}
