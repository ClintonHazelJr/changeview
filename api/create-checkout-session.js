import Stripe from 'stripe';
import { adminClient } from './_adminAuth.js';
import {
  resolvePriceId, priceEnvHint, MARKETING_TO_DB, DB_TO_MARKETING,
} from './_stripePlans.js';

const TIER_ALIASES = {
  solo: 'solo',
  small: 'small',
  enterprise: 'enterprise',
  tier_1: 'solo',
  tier_2: 'enterprise',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // TEMP DEBUG: distinguish missing secret vs missing Price IDs (mask secret).
  const secretKey = process.env.STRIPE_SECRET_KEY;
  console.log('[checkout-debug] STRIPE_SECRET_KEY present:', Boolean(secretKey));
  console.log(
    '[checkout-debug] STRIPE_SECRET_KEY prefix:',
    secretKey ? String(secretKey).slice(0, 7) : '(empty)',
  );

  if (!secretKey) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const stripe = new Stripe(secretKey);

  const { tier: rawTier, billingCycle = 'monthly' } = req.body || {};
  const tier = TIER_ALIASES[rawTier];

  if (!tier) return res.status(400).json({ error: 'Unknown plan tier' });
  if (billingCycle !== 'monthly' && billingCycle !== 'annual') {
    return res.status(400).json({ error: 'Billing cycle must be monthly or annual' });
  }
  if (tier === 'solo' && billingCycle !== 'monthly') {
    return res.status(400).json({ error: 'Solo is billed monthly only' });
  }

  const priceId = resolvePriceId(tier, billingCycle);
  if (!priceId) {
    return res.status(500).json({
      error: `Stripe Price not configured for ${tier} (${billingCycle}). Set ${priceEnvHint(tier, billingCycle)}.`,
    });
  }

  const origin = req.headers.origin
    || (typeof req.headers.referer === 'string' ? req.headers.referer.replace(/\/$/, '') : null)
    || 'http://localhost:5173';

  let accountId = null;
  let customerEmail = null;
  let stripeCustomerId = null;
  let addTrial = true;

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token) {
    const admin = adminClient();
    if (admin) {
      const { data: authData } = await admin.auth.getUser(token);
      if (authData?.user) {
        customerEmail = authData.user.email || null;
        const { data: caller } = await admin
          .from('users')
          .select('account_id, role')
          .eq('id', authData.user.id)
          .maybeSingle();
        if (caller?.role === 'owner' && caller.account_id) {
          accountId = caller.account_id;
          const { data: sub } = await admin
            .from('subscriptions')
            .select('stripe_customer_id, stripe_subscription_id, status')
            .eq('account_id', accountId)
            .maybeSingle();
          stripeCustomerId = sub?.stripe_customer_id || null;
          // Only first Checkout gets a trial; existing Stripe subs are plan changes.
          if (sub?.stripe_subscription_id) addTrial = false;
        }
      }
    }
  }

  const planTier = MARKETING_TO_DB[tier];
  const meta = {
    account_id: accountId || '',
    tier,
    plan_tier: planTier || '',
    billing_cycle: billingCycle,
  };

  try {
    const sessionParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: accountId ? `${origin}/app?checkout=cancelled` : `${origin}/?checkout=cancelled`,
      client_reference_id: accountId || undefined,
      metadata: meta,
      // Always collect a card, even when the subscription starts with a $0 trial.
      payment_method_collection: 'always',
      subscription_data: {
        metadata: meta,
        ...(addTrial ? { trial_period_days: 7 } : {}),
      },
    };

    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
    } else if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.status(200).json({
      url: session.url,
      plan: DB_TO_MARKETING[planTier] || tier,
      billingCycle,
      trial: addTrial,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Checkout failed' });
  }
}
