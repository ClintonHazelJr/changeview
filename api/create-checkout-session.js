import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const PRICES = {
  tier_1_monthly: process.env.STRIPE_PRICE_TIER1_MONTHLY || 'price_tier1_monthly_placeholder',
  tier_2_monthly: process.env.STRIPE_PRICE_TIER2_MONTHLY || 'price_tier2_monthly_placeholder',
  tier_2_annual: process.env.STRIPE_PRICE_TIER2_ANNUAL || 'price_tier2_annual_placeholder',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const { tier, billingCycle = 'monthly' } = req.body;

  if (tier === 'tier_1' && billingCycle !== 'monthly') {
    return res.status(400).json({ error: 'Tier 1 is month-to-month only' });
  }

  const priceKey = tier === 'tier_1' ? 'tier_1_monthly' : `tier_2_${billingCycle}`;
  const priceId = PRICES[priceKey];

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
