/** Start Stripe Checkout for a marketing tier (solo | small | enterprise). */
export async function startCheckout(tier, billingCycle = 'monthly', { accessToken } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers,
    body: JSON.stringify({ tier, billingCycle }),
  });
  const data = await res.json();
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Could not start checkout');
  }
  window.location.href = data.url;
}

export const MARKETING_TO_DB_TIER = {
  solo: 'tier_1',
  small: 'small',
  enterprise: 'tier_2',
  tier_1: 'tier_1',
  tier_2: 'tier_2',
};

export const DB_TO_MARKETING_TIER = {
  tier_1: 'solo',
  small: 'small',
  tier_2: 'enterprise',
};
