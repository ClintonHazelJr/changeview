import { C, tint } from '../../lib/constants';

/** Toggle to reveal soft-deactivated rows. Hidden when there are none (unless already on). */
export default function ShowInactiveToggle({ show, onChange, inactiveCount = 0 }) {
  if (inactiveCount === 0 && !show) return null;
  return (
    <button
      type="button"
      onClick={() => onChange(!show)}
      className="text-xs font-bold px-3 py-1.5 rounded-full"
      style={{
        background: show ? tint(C.sub, '22') : tint(C.navy, '12'),
        color: show ? C.ink : C.navy,
      }}
    >
      {show ? 'Hide inactive' : `Show inactive (${inactiveCount})`}
    </button>
  );
}
