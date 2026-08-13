import { Sparkles } from 'lucide-react';
import { C, HEAD, BODY, tint, PLAN_LABELS } from '../../lib/constants';

export default function UpgradePrompt({
  feature = 'This feature',
  title,
  body,
}) {
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
          {title || `${feature} is an Enterprise feature`}
        </h2>
        <p className="text-sm mb-6" style={{ color: C.sub }}>
          {body || (
            <>
              Your plan is <strong style={{ color: C.ink }}>{PLAN_LABELS.tier_1}</strong>.
              Upgrade to <strong style={{ color: C.ink }}>{PLAN_LABELS.tier_2}</strong> for unlimited
              workspaces, Schedule, Reports, and multi-user access.
            </>
          )}
        </p>
        <a
          href="/#pricing"
          className="inline-flex text-sm font-bold text-white px-6 py-3 rounded-full no-underline"
          style={{ background: C.purple }}
        >
          View Enterprise pricing
        </a>
      </div>
    </div>
  );
}
