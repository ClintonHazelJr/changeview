/** Remember which plan the user picked (pricing → signup → checkout).
 * Uses localStorage so the choice survives email confirmation in the same browser.
 */
const CHECKOUT_INTENT_KEY = 'cv_checkout_intent';

const VALID_TIERS = new Set(['solo', 'small', 'enterprise']);

export function normalizePlanTier(tier) {
  const t = String(tier || '').toLowerCase();
  return VALID_TIERS.has(t) ? t : null;
}

/** @deprecated Use normalizePlanTier — same canonical IDs everywhere. */
export const normalizeMarketingTier = normalizePlanTier;

export function rememberCheckoutIntent(tier, billingCycle = 'monthly') {
  const normalized = normalizePlanTier(tier);
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
      const tier = normalizePlanTier(parsed?.tier);
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

/** Start Stripe Checkout for a plan tier (solo | small | enterprise). */
export async function startCheckout(
  tier,
  billingCycle = 'monthly',
  { accessToken, email, afterSignup = false } = {},
) {
  const normalizedTier = normalizePlanTier(tier);
  const normalizedCycle = billingCycle === 'annual' && normalizedTier !== 'solo' ? 'annual' : 'monthly';
  if (!normalizedTier) {
    throw new Error(`Unknown checkout tier: ${tier}`);
  }
  if (normalizedTier === 'enterprise') {
    throw new Error('Enterprise is sales-assisted. Use Contact Us — there is no self-serve checkout.');
  }

  rememberCheckoutIntent(normalizedTier, normalizedCycle);
  console.log('[checkout] startCheckout', {
    tier: normalizedTier,
    billingCycle: normalizedCycle,
    afterSignup: Boolean(afterSignup),
    hasEmail: Boolean(email),
    hasToken: Boolean(accessToken),
  });

  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      tier: normalizedTier,
      billingCycle: normalizedCycle,
      email: email || undefined,
      afterSignup: Boolean(afterSignup),
    }),
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

/** Update an existing Stripe subscription's plan (in place — no new Checkout). */
export async function updateSubscriptionPlan(
  tier,
  billingCycle = 'monthly',
  { accessToken } = {},
) {
  const normalizedTier = normalizePlanTier(tier);
  const normalizedCycle = billingCycle === 'annual' && normalizedTier !== 'solo' ? 'annual' : 'monthly';
  if (!normalizedTier) {
    throw new Error(`Unknown plan tier: ${tier}`);
  }
  if (normalizedTier === 'enterprise') {
    throw new Error('Enterprise is sales-assisted. Use Contact Us — there is no self-serve upgrade.');
  }

  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch('/api/update-subscription-plan', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      tier: normalizedTier,
      billingCycle: normalizedCycle,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Could not update plan');
  }
  return data;
}
