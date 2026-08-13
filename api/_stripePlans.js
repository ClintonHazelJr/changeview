/** Shared Stripe Price ID → plan mapping (env names only; never hardcode Price IDs). */

export const PRICE_ENV = {
  solo_monthly: ['STRIPE_PRICE_SOLO_MONTHLY', 'STRIPE_PRICE_TIER1_MONTHLY'],
  small_monthly: ['STRIPE_PRICE_SMALL_MONTHLY'],
  small_annual: ['STRIPE_PRICE_SMALL_ANNUAL'],
  enterprise_monthly: ['STRIPE_PRICE_ENTERPRISE_MONTHLY', 'STRIPE_PRICE_TIER2_MONTHLY'],
  enterprise_annual: ['STRIPE_PRICE_ENTERPRISE_ANNUAL', 'STRIPE_PRICE_TIER2_ANNUAL'],
};

export function resolvePriceId(tier, billingCycle) {
  const key = `${tier}_${billingCycle}`;
  const names = PRICE_ENV[key] || [];
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return '';
}

export function priceEnvHint(tier, billingCycle) {
  const names = PRICE_ENV[`${tier}_${billingCycle}`];
  return names?.[0] || 'the matching STRIPE_PRICE_* env var';
}

/** Marketing tier (solo|small|enterprise) → DB plan_tier */
export const MARKETING_TO_DB = {
  solo: 'tier_1',
  small: 'small',
  enterprise: 'tier_2',
  tier_1: 'tier_1',
  tier_2: 'tier_2',
};

export const DB_TO_MARKETING = {
  tier_1: 'solo',
  small: 'small',
  tier_2: 'enterprise',
};

/** Reverse-lookup Price ID → { planTier, billingCycle, marketingTier }. */
export function planFromPriceId(priceId) {
  if (!priceId) return null;
  const catalog = [
    { envKeys: PRICE_ENV.solo_monthly, marketingTier: 'solo', planTier: 'tier_1', billingCycle: 'monthly' },
    { envKeys: PRICE_ENV.small_monthly, marketingTier: 'small', planTier: 'small', billingCycle: 'monthly' },
    { envKeys: PRICE_ENV.small_annual, marketingTier: 'small', planTier: 'small', billingCycle: 'annual' },
    { envKeys: PRICE_ENV.enterprise_monthly, marketingTier: 'enterprise', planTier: 'tier_2', billingCycle: 'monthly' },
    { envKeys: PRICE_ENV.enterprise_annual, marketingTier: 'enterprise', planTier: 'tier_2', billingCycle: 'annual' },
  ];
  for (const row of catalog) {
    for (const key of row.envKeys) {
      if (process.env[key] && process.env[key] === priceId) {
        return {
          marketingTier: row.marketingTier,
          planTier: row.planTier,
          billingCycle: row.billingCycle,
        };
      }
    }
  }
  return null;
}

/** Map Stripe subscription.status → our subscriptions.status values. */
export function mapStripeSubscriptionStatus(stripeStatus) {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'past_due':
    case 'unpaid':
    case 'paused':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'cancelled';
    case 'trialing':
      return 'trialing';
    default:
      return null;
  }
}

export function unixToDateString(unixSeconds) {
  if (!unixSeconds && unixSeconds !== 0) return null;
  return new Date(Number(unixSeconds) * 1000).toISOString().slice(0, 10);
}
