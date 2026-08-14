/** Remember which marketing tier the user picked (pricing → signup → checkout). */
const CHECKOUT_INTENT_KEY = 'cv_checkout_intent';

export function rememberCheckoutIntent(tier, billingCycle = 'monthly') {
  try {
    sessionStorage.setItem(CHECKOUT_INTENT_KEY, JSON.stringify({
      tier,
      billingCycle,
      at: Date.now(),
    }));
  } catch {
    /* ignore */
  }
}

export function readCheckoutIntent() {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.tier) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCheckoutIntent() {
  try {
    sessionStorage.removeItem(CHECKOUT_INTENT_KEY);
  } catch {
    /* ignore */
  }
}

/** Start Stripe Checkout for a marketing tier (solo | small | enterprise). */
export async function startCheckout(tier, billingCycle = 'monthly', { accessToken } = {}) {
  const normalizedTier = String(tier || '').toLowerCase();
  const normalizedCycle = billingCycle === 'annual' ? 'annual' : 'monthly';
  if (!['solo', 'small', 'enterprise', 'tier_1', 'tier_2'].includes(normalizedTier)) {
    throw new Error(`Unknown checkout tier: ${tier}`);
  }

  rememberCheckoutIntent(normalizedTier, normalizedCycle);
  console.log('[checkout] startCheckout', { tier: normalizedTier, billingCycle: normalizedCycle });

  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers,
    body: JSON.stringify({ tier: normalizedTier, billingCycle: normalizedCycle }),
  });
  const data = await res.json();
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Could not start checkout');
  }
  window.location.href = data.url;
}

/** Stripe Customer Portal for updating payment method. */
export async function startBillingPortal({ accessToken } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch('/api/create-portal-session', {
    method: 'POST',
    headers,
  });
  const data = await res.json();
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Could not open billing portal');
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
