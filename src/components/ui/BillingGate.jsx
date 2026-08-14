import { useState } from 'react';
import { C, HEAD, BODY, tint, PLAN_LABELS } from '../../lib/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import {
  DB_TO_MARKETING_TIER,
  normalizeMarketingTier,
  readCheckoutIntent,
  startCheckout,
  startBillingPortal,
} from '../../lib/checkout';

/**
 * Billing gates:
 * - incomplete: finish Stripe Checkout (card for 7-day trial)
 * - past_due: update card via Stripe Customer Portal
 */
export default function BillingGate({ mode = 'past_due' }) {
  const { session } = useAuth();
  const { planTier, subscription, reload, loading } = useWorkspace();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const intent = readCheckoutIntent();
  const intentTier = normalizeMarketingTier(intent?.tier);
  // Prefer: remembered pricing-card intent → loaded subscription.plan_tier → context planTier.
  // Never use the WorkspaceContext default (tier_1) while subscription is still loading.
  const fromDb = normalizeMarketingTier(
    DB_TO_MARKETING_TIER[subscription?.plan_tier]
    || DB_TO_MARKETING_TIER[planTier]
    || subscription?.plan_tier
    || planTier,
  );
  const marketingTier = intentTier || (!loading ? fromDb : null);
  const billingCycle = (
    intent?.billingCycle === 'annual'
    || subscription?.billing_cycle === 'annual'
  ) && marketingTier && marketingTier !== 'solo'
    ? 'annual'
    : 'monthly';

  const openCheckout = async () => {
    setError('');
    if (loading || !marketingTier) {
      setError('Loading your selected plan… try again in a moment.');
      return;
    }
    setBusy(true);
    try {
      console.log('[billing-gate] starting checkout', { marketingTier, billingCycle, intentTier, fromDb });
      await startCheckout(marketingTier, billingCycle, {
        accessToken: session?.access_token,
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const openPortal = async () => {
    setError('');
    setBusy(true);
    try {
      await startBillingPortal({ accessToken: session?.access_token });
      await reload();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const isIncomplete = mode === 'incomplete';
  const planLabel = PLAN_LABELS[marketingTier] || PLAN_LABELS[planTier] || 'your plan';

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto" style={{ ...BODY, background: `linear-gradient(180deg, ${C.bg}, ${tint(C.purple, '12')})` }}>
      <div className="max-w-lg mx-auto px-6 py-16">
        <div className="bg-white rounded-3xl border shadow-sm p-8 text-center" style={{ borderColor: C.border }}>
          <h1 className="text-2xl font-extrabold mb-2" style={{ ...HEAD, color: C.ink }}>
            {isIncomplete ? 'Start your 7-day free trial' : 'Payment needs attention'}
          </h1>
          <p className="text-sm mb-2" style={{ color: C.sub }}>
            {isIncomplete
              ? 'Add a card in Stripe Checkout to begin. You will not be charged until the trial ends.'
              : 'Your trial converted but the charge on file failed. Update your card to restore access — your data is safe.'}
          </p>
          <p className="text-xs font-semibold mb-6" style={{ color: C.purple }}>
            Plan: {loading && !marketingTier ? 'Loading…' : planLabel}
            {marketingTier ? (billingCycle === 'annual' ? ' · annual' : ' · monthly') : ''}
          </p>
          {error && <p className="text-sm mb-4" style={{ color: C.coral }}>{error}</p>}
          <button
            type="button"
            disabled={busy || (isIncomplete && (loading || !marketingTier))}
            onClick={isIncomplete ? openCheckout : openPortal}
            className="w-full text-sm font-bold text-white py-3 rounded-full disabled:opacity-50"
            style={{ background: C.purple }}
          >
            {busy
              ? 'Redirecting…'
              : isIncomplete
                ? 'Continue to secure checkout'
                : 'Update payment method'}
          </button>
        </div>
      </div>
    </div>
  );
}
