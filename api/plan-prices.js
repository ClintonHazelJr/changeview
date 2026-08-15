import { createStripeClient } from './_stripeClient.js';
import { PRICE_ENV } from './_stripePlans.js';
import { ANNUAL_SAVE_LABEL, FALLBACK_PLAN_PRICES } from '../shared/planPrices.js';

/** In-memory cache for this serverless instance (avoids 5 Stripe GETs every paint). */
let cached = null;
let cachedAt = 0;
const CACHE_MS = 5 * 60 * 1000;

function centsToDollars(unitAmount) {
  if (unitAmount == null || !Number.isFinite(Number(unitAmount))) return null;
  return Number(unitAmount) / 100;
}

async function fetchAmount(stripe, envNames) {
  for (const name of envNames || []) {
    const id = process.env[name];
    if (!id || !String(id).trim()) continue;
    try {
      const price = await stripe.prices.retrieve(String(id).trim());
      const dollars = centsToDollars(price.unit_amount);
      if (dollars != null) {
        return {
          amount: dollars,
          currency: String(price.currency || 'usd').toLowerCase(),
          priceId: price.id,
        };
      }
    } catch (err) {
      console.warn('[plan-prices] retrieve failed', name, err.message);
    }
  }
  return null;
}

async function buildCatalog() {
  const fallback = {
    currency: 'usd',
    source: 'fallback',
    annualSaveLabel: ANNUAL_SAVE_LABEL,
    plans: structuredClone(FALLBACK_PLAN_PRICES),
  };

  if (!process.env.STRIPE_SECRET_KEY) return fallback;

  let stripe;
  try {
    stripe = createStripeClient();
  } catch {
    return fallback;
  }

  const specs = [
    { tier: 'solo', cycle: 'monthly', envKeys: PRICE_ENV.solo_monthly },
    { tier: 'small', cycle: 'monthly', envKeys: PRICE_ENV.small_monthly },
    { tier: 'small', cycle: 'annual', envKeys: PRICE_ENV.small_annual },
    { tier: 'enterprise', cycle: 'monthly', envKeys: PRICE_ENV.enterprise_monthly },
    { tier: 'enterprise', cycle: 'annual', envKeys: PRICE_ENV.enterprise_annual },
  ];

  const plans = structuredClone(FALLBACK_PLAN_PRICES);
  let anyLive = false;
  let currency = 'usd';

  await Promise.all(specs.map(async (spec) => {
    const live = await fetchAmount(stripe, spec.envKeys);
    if (!live) return;
    anyLive = true;
    currency = live.currency || currency;
    if (!plans[spec.tier]) plans[spec.tier] = {};
    plans[spec.tier][spec.cycle] = live.amount;
  }));

  return {
    currency,
    source: anyLive ? 'stripe' : 'fallback',
    annualSaveLabel: ANNUAL_SAVE_LABEL,
    plans,
  };
}

/**
 * GET /api/plan-prices
 * Returns display amounts from Stripe Price objects (unit_amount), falling back
 * to shared/planPrices.js when Stripe or Price IDs are missing.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const now = Date.now();
    if (cached && now - cachedAt < CACHE_MS) {
      return res.status(200).json(cached);
    }
    const catalog = await buildCatalog();
    cached = catalog;
    cachedAt = now;
    return res.status(200).json(catalog);
  } catch (err) {
    console.error('[plan-prices]', err);
    return res.status(200).json({
      currency: 'usd',
      source: 'fallback',
      annualSaveLabel: ANNUAL_SAVE_LABEL,
      plans: FALLBACK_PLAN_PRICES,
      error: err.message,
    });
  }
}
