import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { C, HEAD, BODY, tint, PLAN_LABELS } from '../../lib/constants';
import { usePlanPrices } from '../../hooks/usePlanPrices';
import { formatPlanPrice } from '../../../shared/planPrices.js';

export default function UpgradePrompt({
  feature = 'This feature',
  title,
  body,
  onUpgrade,
}) {
  const { plans } = usePlanPrices();
  const smallPrice = formatPlanPrice(plans, 'small', 'monthly');

  const defaultBody = (
    <>
      Your plan is <strong style={{ color: C.ink }}>{PLAN_LABELS.solo}</strong>.
      {' '}{PLAN_LABELS.small} unlocks Schedule, Tasks, and 5 more reports
      {smallPrice ? ` (${smallPrice})` : ''}
      . Need unlimited seats?{' '}
      <Link to="/contact" style={{ color: C.purple }}>Contact us</Link>
      {' '}for {PLAN_LABELS.enterprise}.
    </>
  );

  return (
    <div className="flex-1 p-8 max-w-xl w-full mx-auto flex items-center justify-center" style={BODY}>
      <div className="bg-white rounded-3xl border shadow-sm p-8 text-center w-full" style={{ borderColor: C.border }}>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: tint(C.purple, '16') }}
        >
          <Sparkles size={22} style={{ color: C.purple }} />
        </div>
        <h2 className="text-xl font-extrabold mb-2" style={{ ...HEAD, color: C.ink }}>
          {title || `${feature} is ready when you are — unlock with ${PLAN_LABELS.small}`}
        </h2>
        <p className="text-sm mb-6" style={{ color: C.sub }}>
          {body || defaultBody}
        </p>
        {onUpgrade ? (
          <button
            type="button"
            onClick={onUpgrade}
            className="inline-flex text-sm font-bold text-white px-6 py-3 rounded-full"
            style={{ background: C.purple }}
          >
            Upgrade Plan
          </button>
        ) : (
          <a
            href="/#pricing"
            className="inline-flex text-sm font-bold text-white px-6 py-3 rounded-full no-underline"
            style={{ background: C.purple }}
          >
            View pricing
          </a>
        )}
      </div>
    </div>
  );
}
