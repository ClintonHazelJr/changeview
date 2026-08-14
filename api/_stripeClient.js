import Stripe from 'stripe';

/**
 * Pin Basil so Checkout / Managed Payments stay compatible with the account.
 * Do not rely on stripe-node's default (can lag the account default).
 */
export const STRIPE_API_VERSION = '2025-03-31.basil';

/** Create a Stripe client with the pinned API version. Requires a non-empty secret. */
export function createStripeClient(secretKey = process.env.STRIPE_SECRET_KEY) {
  if (!secretKey) {
    throw new Error('Stripe not configured');
  }
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
}

/**
 * Basil moved current_period_end onto subscription items.
 * Prefer top-level when present (older payloads), else first item.
 */
export function subscriptionPeriodEndUnix(subscription) {
  if (!subscription) return null;
  if (subscription.current_period_end != null) return subscription.current_period_end;
  return subscription.items?.data?.[0]?.current_period_end ?? null;
}
