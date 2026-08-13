import Stripe from 'stripe';
import { adminClient, setCors, requireAccountOwner } from './_adminAuth.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const TIER_TO_DB = {
  solo: 'tier_1',
  small: 'small',
  enterprise: 'tier_2',
  tier_1: 'tier_1',
  tier_2: 'tier_2',
};

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

  // Owners convert the account; also allow the signed-in account holder via same helper.
  const { caller, error: authError } = await requireAccountOwner(admin, req);
  if (authError) return res.status(authError.status).json({ error: authError.message });

  const sessionId = String(req.body?.sessionId || '').trim();
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Invalid checkout session' });
  }

  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    return res.status(400).json({ error: 'Checkout is not complete yet' });
  }

  const metaAccount = session.metadata?.account_id;
  if (metaAccount && metaAccount !== caller.account_id) {
    return res.status(403).json({ error: 'Checkout session does not belong to this account' });
  }

  const marketingTier = session.metadata?.tier || 'solo';
  const planTier = TIER_TO_DB[marketingTier] || 'tier_1';
  let billingCycle = session.metadata?.billing_cycle || 'monthly';
  if (planTier === 'tier_1') billingCycle = 'monthly';

  const { error: updateErr } = await admin
    .from('subscriptions')
    .update({
      plan_tier: planTier,
      billing_cycle: billingCycle,
      status: 'active',
      trial_ends_at: null,
      stripe_subscription_id: typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('account_id', caller.account_id);

  if (updateErr) {
    return res.status(500).json({ error: updateErr.message || 'Failed to activate subscription' });
  }

  return res.status(200).json({ ok: true, planTier, billingCycle });
}
