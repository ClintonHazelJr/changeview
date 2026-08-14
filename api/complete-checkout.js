import { adminClient, setCors, requireAccountOwner } from './_adminAuth.js';
import { createStripeClient, subscriptionPeriodEndUnix } from './_stripeClient.js';
import {
  planFromPriceId, normalizePlanTier, unixToDateString, unixToIso, mapStripeSubscriptionStatus,
} from './_stripePlans.js';

/**
 * Optimistic sync after Checkout redirect.
 * Webhook remains source of truth; this unblocks the UI quickly.
 * Trial checkouts often have payment_status = no_payment_required.
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = adminClient();
  if (!admin) {
    return res.status(500).json({ error: 'Service not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const stripe = createStripeClient(process.env.STRIPE_SECRET_KEY);

  const { caller, error: authError } = await requireAccountOwner(admin, req);
  if (authError) return res.status(authError.status).json({ error: authError.message });

  const sessionId = String(req.body?.sessionId || '').trim();
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'subscription.items.data.price'],
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Invalid checkout session' });
  }

  if (session.status !== 'complete') {
    return res.status(400).json({ error: 'Checkout is not complete yet' });
  }

  const metaAccount = session.metadata?.account_id || session.client_reference_id;
  if (metaAccount && metaAccount !== caller.account_id) {
    return res.status(403).json({ error: 'Checkout session does not belong to this account' });
  }

  let stripeSub = typeof session.subscription === 'object' ? session.subscription : null;
  if (!stripeSub && typeof session.subscription === 'string') {
    try {
      stripeSub = await stripe.subscriptions.retrieve(session.subscription);
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Could not load subscription' });
    }
  }
  if (!stripeSub) {
    return res.status(400).json({ error: 'Checkout session has no subscription' });
  }

  const priceId = stripeSub?.items?.data?.[0]?.price?.id || null;
  const fromPrice = planFromPriceId(priceId);
  const planTier = fromPrice?.planTier
    || normalizePlanTier(session.metadata?.tier)
    || normalizePlanTier(session.metadata?.plan_tier)
    || 'solo';
  let billingCycle = fromPrice?.billingCycle || session.metadata?.billing_cycle || 'monthly';
  if (planTier === 'solo') billingCycle = 'monthly';

  const stripeCustomerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id || null;
  const mappedStatus = mapStripeSubscriptionStatus(stripeSub.status) || 'trialing';

  const { error: updateErr } = await admin
    .from('subscriptions')
    .update({
      plan_tier: planTier,
      billing_cycle: billingCycle,
      status: mappedStatus,
      trial_ends_at: mappedStatus === 'active'
        ? null
        : (stripeSub.trial_end ? unixToIso(stripeSub.trial_end) : null),
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSub.id,
      current_period_end: unixToDateString(subscriptionPeriodEndUnix(stripeSub)),
      updated_at: new Date().toISOString(),
    })
    .eq('account_id', caller.account_id);

  if (updateErr) {
    return res.status(500).json({ error: updateErr.message || 'Failed to sync subscription' });
  }

  return res.status(200).json({ ok: true, planTier, billingCycle, status: mappedStatus });
}
