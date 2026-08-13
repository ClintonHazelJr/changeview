import Stripe from 'stripe';
import { adminClient, setCors, requireAccountOwner, LONG_BAN } from './_adminAuth.js';
import { wipeAccountWorkspaces } from './_accountWipe.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

/**
 * Owner-only: cancel Stripe, ban all users, soft-delete account, wipe workspaces.
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

  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_subscription_id, status')
    .eq('account_id', caller.account_id)
    .maybeSingle();

  // 1) Cancel Stripe subscription (if any).
  if (sub?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    try {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    } catch (err) {
      // Already cancelled in Stripe is fine; other errors should block.
      const msg = String(err?.message || '');
      const code = err?.code || err?.raw?.code;
      if (code !== 'resource_missing' && !/no such subscription/i.test(msg) && !/already canceled/i.test(msg)) {
        return res.status(502).json({ error: msg || 'Could not cancel Stripe subscription' });
      }
    }
  }

  if (sub) {
    await admin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        trial_ends_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', caller.account_id);
  }

  // 2) Ban every user on the account in Auth + mark inactive.
  const { data: users, error: usersErr } = await admin
    .from('users')
    .select('id')
    .eq('account_id', caller.account_id);
  if (usersErr) {
    return res.status(500).json({ error: usersErr.message || 'Could not list users' });
  }

  for (const u of users || []) {
    try {
      await admin.auth.admin.updateUserById(u.id, { ban_duration: LONG_BAN });
    } catch (err) {
      console.error('Failed to ban user', u.id, err?.message);
    }
    try {
      await admin.auth.admin.signOut(u.id, 'global');
    } catch {
      // optional
    }
  }

  await admin
    .from('users')
    .update({ is_active: false, default_workspace_id: null })
    .eq('account_id', caller.account_id);

  // 3) Soft-delete the account.
  const { error: delErr } = await admin
    .from('accounts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', caller.account_id);
  if (delErr) {
    return res.status(500).json({ error: delErr.message || 'Could not mark account deleted' });
  }

  // 4) Wipe all workspace content.
  try {
    await wipeAccountWorkspaces(admin, caller.account_id);
  } catch (err) {
    // Account is already soft-deleted + users banned; log wipe failures.
    console.error('Account wipe after delete failed:', err.message);
  }

  return res.status(200).json({ ok: true });
}
