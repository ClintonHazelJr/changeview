import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { C, HEAD, BODY, tint, PLAN_LABELS } from '../../lib/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { DB_TO_MARKETING_TIER, startCheckout } from '../../lib/checkout';

const PRICING = {
  solo: { monthly: 59, label: 'Solo' },
  small: { monthly: 149, annual: 1490, label: 'Small' },
  enterprise: { monthly: 299, annual: 2990, label: 'Enterprise' },
};

function formatUsd(n) {
  return `$${n.toLocaleString('en-US')}`;
}

/** @param {{ dismissible?: boolean, onClose?: () => void }} props */
export default function TrialEndedGate({ dismissible = false, onClose }) {
  const { session } = useAuth();
  const { planTier, reload } = useWorkspace();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const suggested = DB_TO_MARKETING_TIER[planTier] || 'small';
  const annual = billingCycle === 'annual';

  const pay = async (tier) => {
    setError('');
    setBusy(tier);
    try {
      await startCheckout(tier, tier === 'solo' ? 'monthly' : billingCycle, {
        accessToken: session?.access_token,
      });
      await reload();
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto" style={{ ...BODY, background: `linear-gradient(180deg, ${C.bg}, ${tint(C.purple, '12')})` }}>
      <div className="max-w-5xl mx-auto px-6 py-12 relative">
        {dismissible && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-sm font-bold px-3 py-1.5 rounded-full"
            style={{ color: C.sub, background: '#fff', border: `1px solid ${C.border}` }}
          >
            Back to app
          </button>
        )}
        <h1 className="text-2xl md:text-3xl font-extrabold text-center mb-2" style={{ ...HEAD, color: C.ink }}>
          {dismissible ? 'Choose a plan to continue' : 'Your trial has ended'}
        </h1>
        <p className="text-sm text-center mb-2 max-w-lg mx-auto" style={{ color: C.sub }}>
          {dismissible
            ? 'You currently have full Enterprise-level access during your trial. After you subscribe, your selected plan limits apply.'
            : 'Your data is safe. Choose a plan to keep working — pick up right where you left off.'}
        </p>
        <p className="text-xs text-center mb-8 font-semibold" style={{ color: C.purple }}>
          You started on {PLAN_LABELS[planTier] || planTier}
        </p>

        <div className="flex justify-center mb-6">
          <div className="inline-flex p-1 rounded-full border bg-white shadow-sm" style={{ borderColor: C.border }}>
            {['monthly', 'annual'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setBillingCycle(key)}
                className="text-xs font-bold px-4 py-2 rounded-full capitalize"
                style={{
                  background: billingCycle === key ? C.purple : 'transparent',
                  color: billingCycle === key ? '#fff' : C.sub,
                }}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-center mb-4" style={{ color: C.coral }}>{error}</p>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {['solo', 'small', 'enterprise'].map((tier) => {
            const p = PRICING[tier];
            const price = tier === 'solo' || !annual ? p.monthly : p.annual;
            const unit = tier === 'solo' || !annual ? '/mo' : '/yr';
            const featured = tier === suggested;
            return (
              <div
                key={tier}
                className="rounded-3xl p-6 border bg-white flex flex-col"
                style={{ borderColor: featured ? C.purple : C.border, borderWidth: featured ? 2 : 1 }}
              >
                <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: featured ? C.purple : C.sub }}>
                  {p.label}
                </div>
                <div className="text-2xl font-extrabold mb-4" style={{ ...HEAD, color: C.ink }}>
                  {formatUsd(price)}
                  <span className="text-sm font-medium" style={{ color: C.sub }}>{unit}</span>
                </div>
                <ul className="space-y-2 mb-6 flex-1 text-sm" style={{ color: C.ink }}>
                  {(tier === 'solo'
                    ? ['1 Workspace', '1 User', 'Reports']
                    : tier === 'small'
                      ? ['Unlimited Workspaces', 'Up to 5 Users', 'Tasks & Schedule']
                      : ['Unlimited Workspaces', 'Unlimited Users', 'Tasks & Schedule']
                  ).map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check size={14} style={{ color: C.green }} /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => pay(tier)}
                  className="w-full text-sm font-bold text-white py-3 rounded-full disabled:opacity-50"
                  style={{ background: featured ? C.purple : C.ink }}
                >
                  {busy === tier ? 'Redirecting…' : 'Choose this plan'}
                </button>
                {tier === 'solo' && annual && (
                  <p className="text-[10px] mt-2 text-center" style={{ color: C.sub }}>Solo is monthly only</p>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-center mt-8 flex items-center justify-center gap-1" style={{ color: C.sub }}>
          <X size={12} className="opacity-0" />
          Your existing Initiatives, Impacts, and Requirements stay intact.
        </p>
      </div>
    </div>
  );
}
