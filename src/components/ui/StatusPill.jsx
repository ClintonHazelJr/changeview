import { C, tint, STATUS_COLOR } from '../../lib/constants';

export default function StatusPill({ label, color }) {
  const c = color || STATUS_COLOR[label] || C.sub;
  return (
    <span
      className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full capitalize whitespace-nowrap"
      style={{ background: tint(c, '22'), color: c }}
    >
      {label}
    </span>
  );
}
