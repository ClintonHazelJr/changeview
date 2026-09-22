/**
 * Single source of truth for display pricing.
 * Live amounts come from Stripe Price objects via /api/plan-prices;
 * these fallbacks keep marketing/signup usable if Stripe is unavailable.
 *
 * Annual = 10 × monthly ("2 months free").
 */
export const FALLBACK_PLAN_PRICES = {
  solo: { monthly: 39 },
  small: { monthly: 99, annual: 990 },
  enterprise: { monthly: 199, annual: 1990 },
};

export const ANNUAL_SAVE_LABEL = '2 months free';

export function formatUsdAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
}

/** Whole dollars for a tier + cycle from a plans map. */
export function priceAmount(plans, tier, billingCycle = 'monthly') {
  const row = plans?.[tier] || FALLBACK_PLAN_PRICES[tier];
  if (!row) return null;
  if (billingCycle === 'annual' && row.annual != null) return row.annual;
  return row.monthly ?? null;
}

/** e.g. "$99/mo" or "$990/yr" */
export function formatPlanPrice(plans, tier, billingCycle = 'monthly') {
  const amount = priceAmount(plans, tier, billingCycle);
  if (amount == null) return '';
  const cycle = billingCycle === 'annual' && tier !== 'solo' ? 'annual' : 'monthly';
  return `$${formatUsdAmount(amount)}${cycle === 'annual' ? '/yr' : '/mo'}`;
}

export function pricePeriodLabel(billingCycle) {
  return billingCycle === 'annual' ? '/ yr' : '/ mo';
}
