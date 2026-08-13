import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

/** One Product per tier in Stripe; attach these Price IDs via env. */
const PRICES = {
  solo_monthly:
    process.env.STRIPE_PRICE_SOLO_MONTHLY
    || process.env.STRIPE_PRICE_TIER1_MONTHLY
    || '',
  small_monthly: process.env.STRIPE_PRICE_SMALL_MONTHLY || '',
  small_annual: process.env.STRIPE_PRICE_SMALL_ANNUAL || '',
  enterprise_monthly:
    process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY
    || process.env.STRIPE_PRICE_TIER2_MONTHLY
    || '',
  enterprise_annual:
    process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL
    || process.env.STRIPE_PRICE_TIER2_ANNUAL
    || '',
};

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const { tier: rawTier, billingCycle = 'monthly' } = req.body || {};
  const tier = TIER_ALIASES[rawTier];

  if (!tier) {
    return res.status(400).json({ error: 'Unknown plan tier' });
  }

  if (billingCycle !== 'monthly' && billingCycle !== 'annual') {
    return res.status(400).json({ error: 'Billing cycle must be monthly or annual' });
  }

  if (tier === 'solo' && billingCycle !== 'monthly') {
    return res.status(400).json({ error: 'Solo is billed monthly only' });
  }

  const priceKey = `${tier}_${billingCycle}`;
  const priceId = PRICES[priceKey];

  if (!priceId) {
    return res.status(500).json({
      error: `Stripe Price not configured for ${tier} (${billingCycle}). Set ${priceEnvHint(tier, billingCycle)}.`,
    });
  }

  const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'http://localhost:5173';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      metadata: { tier, billing_cycle: billingCycle },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Checkout failed' });
  }
}

function priceEnvHint(tier, billingCycle) {
  const map = {
    solo_monthly: 'STRIPE_PRICE_SOLO_MONTHLY',
    small_monthly: 'STRIPE_PRICE_SMALL_MONTHLY',
    small_annual: 'STRIPE_PRICE_SMALL_ANNUAL',
    enterprise_monthly: 'STRIPE_PRICE_ENTERPRISE_MONTHLY',
    enterprise_annual: 'STRIPE_PRICE_ENTERPRISE_ANNUAL',
  };
  return map[`${tier}_${billingCycle}`] || 'the matching STRIPE_PRICE_* env var';
}
