import { adminClient, setCors, requireAccountOwner } from './_adminAuth.js';
import { createStripeClient } from './_stripeClient.js';
import {
  normalizePlanTier,
  resolvePriceBinding,
  priceEnvHint,
  PLAN_TIERS,
} from './_stripePlans.js';

const TIER_RANK = { solo: 0, small: 1, enterprise: 2 };

/**
 * Upgrade (or change) an existing Stripe subscription's price in place.
 * Does NOT create a Checkout Session — avoids a second subscription.
 *
 * Always invoices the prorated difference immediately.
 * Resets billing_cycle_anchor to now when not trialing (Stripe blocks that
 * combo during trial; price change still applies and trial continues).
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const stripe = createStripeClient(process.env.STRIPE_SECRET_KEY);
  const admin = adminClient();
  if (!admin) {
    return res.status(500).json({ error: 'Service not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const { caller, error: authError } = await requireAccountOwner(admin, req);
  if (authError) return res.status(authError.status).json({ error: authError.message });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const tier = normalizePlanTier(body.tier);
  let billingCycle = body.billingCycle === 'annual' ? 'annual' : 'monthly';
  if (tier === 'solo') billingCycle = 'monthly';

  if (!tier || !PLAN_TIERS.has(tier)) {
    return res.status(400).json({ error: 'Invalid plan tier' });
  }

  const { data: sub, error: subErr } = await admin
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, status, plan_tier, billing_cycle')
    .eq('account_id', caller.account_id)
    .maybeSingle();

  if (subErr) return res.status(500).json({ error: subErr.message });
  if (!sub?.stripe_subscription_id) {
    return res.status(400).json({
      error: 'No active Stripe subscription to update. Complete checkout first.',
    });
  }

  const currentRank = TIER_RANK[sub.plan_tier] ?? 0;
  const nextRank = TIER_RANK[tier] ?? 0;
  if (nextRank < currentRank) {
    // Downgrade limit check — warn/block if usage would violate Starter caps.
    if (tier === 'solo') {
      const [{ count: wsCount }, { count: userCount }] = await Promise.all([
        admin.from('workspaces').select('id', { count: 'exact', head: true }).eq('account_id', caller.account_id),
        admin.from('users').select('id', { count: 'exact', head: true }).eq('account_id', caller.account_id).neq('is_active', false),
      ]);
      if ((wsCount ?? 0) > 1 || (userCount ?? 0) > 1) {
        return res.status(400).json({
          error: `Cannot switch to Starter while this account has ${wsCount ?? 0} workspaces and ${userCount ?? 0} users. Starter allows 1 workspace and 1 user. Remove extras first, or stay on Pro/Enterprise.`,
        });
      }
    }
  }

  const binding = resolvePriceBinding(tier, billingCycle);
  if (!binding.priceId) {
    return res.status(500).json({
      error: `Billing misconfiguration: set ${priceEnvHint(tier, billingCycle)}`,
    });
  }

  try {
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const item = stripeSub.items?.data?.[0];
    if (!item?.id) {
      return res.status(400).json({ error: 'Subscription has no billable item to update' });
    }

    if (item.price?.id === binding.priceId) {
      return res.status(400).json({ error: 'You are already on that plan and billing cycle.' });
    }

    const updatePayload = {
      items: [{ id: item.id, price: binding.priceId }],
      proration_behavior: 'always_invoice',
      metadata: {
        ...(stripeSub.metadata || {}),
        plan_tier: tier,
        billing_cycle: billingCycle,
        account_id: caller.account_id,
      },
    };

    // Stripe rejects billing_cycle_anchor changes while trialing; price still updates
    // and the trial continues until conversion.
    if (stripeSub.status !== 'trialing') {
      updatePayload.billing_cycle_anchor = 'now';
    }

    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, updatePayload);

    console.log('[update-subscription-plan] updated', {
      accountId: caller.account_id,
      subscriptionId: updated.id,
      status: updated.status,
      tier,
      billingCycle,
      priceEnv: binding.envName,
      billingCycleAnchorReset: stripeSub.status !== 'trialing',
    });

    return res.status(200).json({
      ok: true,
      tier,
      billingCycle,
      status: updated.status,
      // Webhook customer.subscription.updated syncs DB; return hints for optimistic UI.
      message: 'Plan updated. Billing will refresh in a moment.',
    });
  } catch (err) {
    console.error('[update-subscription-plan] failed', err);
    return res.status(500).json({ error: err.message || 'Could not update subscription' });
  }
}
