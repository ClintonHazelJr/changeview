/** Shared Stripe Price ID → plan mapping (env names only; never hardcode Price IDs). */

export const PRICE_ENV = {
  solo_monthly: ['STRIPE_PRICE_SOLO_MONTHLY', 'STRIPE_PRICE_TIER1_MONTHLY'],
  small_monthly: ['STRIPE_PRICE_SMALL_MONTHLY'],
  small_annual: ['STRIPE_PRICE_SMALL_ANNUAL'],
  enterprise_monthly: ['STRIPE_PRICE_ENTERPRISE_MONTHLY', 'STRIPE_PRICE_TIER2_MONTHLY'],
  enterprise_annual: ['STRIPE_PRICE_ENTERPRISE_ANNUAL', 'STRIPE_PRICE_TIER2_ANNUAL'],
};

export function resolvePriceId(tier, billingCycle) {
  return resolvePriceBinding(tier, billingCycle).priceId;
}

/** Resolve Price ID + which env var supplied it (for misconfig detection). */
export function resolvePriceBinding(tier, billingCycle) {
  const key = `${tier}_${billingCycle}`;
  const names = PRICE_ENV[key] || [];
  console.log('[checkout-debug] resolvePriceId key:', key, 'env names:', names);
  for (const name of names) {
    const value = process.env[name];
    const hasValue = Boolean(value && String(value).trim());
    console.log(
      '[checkout-debug] env',
      name,
      hasValue ? `set (prefix=${String(value).slice(0, 12)}…)` : 'EMPTY',
    );
    if (hasValue) {
      return { priceId: String(value).trim(), envName: name, key };
    }
  }
  if (!names.length) {
    console.log('[checkout-debug] no PRICE_ENV mapping for key:', key);
  }
  return { priceId: '', envName: null, key };
}

export function priceEnvHint(tier, billingCycle) {
  const names = PRICE_ENV[`${tier}_${billingCycle}`];
  return names?.[0] || 'the matching STRIPE_PRICE_* env var';
}

/** Canonical plan_tier values written to the DB and used everywhere in the app. */
export const PLAN_TIERS = new Set(['solo', 'small', 'enterprise']);

export function normalizePlanTier(tier) {
  const t = String(tier || '').toLowerCase();
  return PLAN_TIERS.has(t) ? t : null;
}

/** Reverse-lookup Price ID → { planTier, billingCycle }. */
export function planFromPriceId(priceId) {
  if (!priceId) return null;
  const catalog = [
    { envKeys: PRICE_ENV.solo_monthly, planTier: 'solo', billingCycle: 'monthly' },
    { envKeys: PRICE_ENV.small_monthly, planTier: 'small', billingCycle: 'monthly' },
    { envKeys: PRICE_ENV.small_annual, planTier: 'small', billingCycle: 'annual' },
    { envKeys: PRICE_ENV.enterprise_monthly, planTier: 'enterprise', billingCycle: 'monthly' },
    { envKeys: PRICE_ENV.enterprise_annual, planTier: 'enterprise', billingCycle: 'annual' },
  ];
  for (const row of catalog) {
    for (const key of row.envKeys) {
      if (process.env[key] && process.env[key] === priceId) {
        return {
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
    case 'incomplete':
      return 'incomplete';
    default:
      return null;
  }
}

/** Unix seconds → timestamptz ISO string (for trial_ends_at). */
export function unixToIso(unixSeconds) {
  if (!unixSeconds && unixSeconds !== 0) return null;
  return new Date(Number(unixSeconds) * 1000).toISOString();
}

export function unixToDateString(unixSeconds) {
  if (!unixSeconds && unixSeconds !== 0) return null;
  return new Date(Number(unixSeconds) * 1000).toISOString().slice(0, 10);
}
