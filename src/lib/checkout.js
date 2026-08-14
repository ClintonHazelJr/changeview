/** Remember which marketing tier the user picked (pricing → signup → checkout).
 * Uses localStorage so the choice survives email confirmation in the same browser.
 */
const CHECKOUT_INTENT_KEY = 'cv_checkout_intent';

const VALID_TIERS = new Set(['solo', 'small', 'enterprise', 'tier_1', 'tier_2']);

export function normalizeMarketingTier(tier) {
  const t = String(tier || '').toLowerCase();
  if (t === 'tier_1') return 'solo';
  if (t === 'tier_2') return 'enterprise';
  if (t === 'solo' || t === 'small' || t === 'enterprise') return t;
  return null;
}

export function rememberCheckoutIntent(tier, billingCycle = 'monthly') {
  const normalized = normalizeMarketingTier(tier);
  if (!normalized) return;
  const payload = {
    tier: normalized,
    billingCycle: billingCycle === 'annual' && normalized !== 'solo' ? 'annual' : 'monthly',
    at: Date.now(),
  };
  try {
    localStorage.setItem(CHECKOUT_INTENT_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.setItem(CHECKOUT_INTENT_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readCheckoutIntent() {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(CHECKOUT_INTENT_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const tier = normalizeMarketingTier(parsed?.tier);
      if (!tier) continue;
      return {
        tier,
        billingCycle: parsed.billingCycle === 'annual' && tier !== 'solo' ? 'annual' : 'monthly',
        at: parsed.at || null,
      };
    } catch {
      /* try next */
    }
  }
  return null;
}

export function clearCheckoutIntent() {
  try { localStorage.removeItem(CHECKOUT_INTENT_KEY); } catch { /* ignore */ }
  try { sessionStorage.removeItem(CHECKOUT_INTENT_KEY); } catch { /* ignore */ }
}

/** Start Stripe Checkout for a marketing tier (solo | small | enterprise). */
export async function startCheckout(tier, billingCycle = 'monthly', { accessToken } = {}) {
  const normalizedTier = normalizeMarketingTier(tier);
  const normalizedCycle = billingCycle === 'annual' && normalizedTier !== 'solo' ? 'annual' : 'monthly';
  if (!normalizedTier || !VALID_TIERS.has(normalizedTier)) {
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
  console.log('[checkout] session created', {
    tier: data.tier || normalizedTier,
    priceEnv: data.priceEnv || null,
    pricePrefix: data.pricePrefix || null,
  });
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
