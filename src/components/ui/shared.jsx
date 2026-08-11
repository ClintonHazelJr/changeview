import { Plus } from 'lucide-react';
import { C } from '../../lib/constants';

export function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold mb-1.5" style={{ color: C.sub }}>{label}</label>
      {children}
    </div>
  );
}

export function Pill({ active, color, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-semibold px-3 py-1.5 rounded-full border mr-2 mb-2 transition-colors"
      style={
        active
          ? { background: color, borderColor: color, color: '#fff' }
          : { background: '#fff', borderColor: C.border, color: C.sub }
      }
    >
      {children}
    </button>
  );
}

export function SaveRow({ label = 'Save', disabled }) {
  return (
    <div className="flex justify-end gap-2 mt-2 sticky bottom-0 bg-white pt-2">
      <button
        type="submit"
        disabled={disabled}
        className="text-sm font-bold text-white px-5 py-2.5 rounded-full shadow-sm disabled:opacity-60"
        style={{ background: C.purple }}
      >
        {label}
      </button>
    </div>
  );
}

export function ListCard({ icon: Icon, color, title, subtitle, tag }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-3" style={{ borderColor: C.border }}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold truncate" style={{ color: C.ink }}>{title}</div>
        {subtitle && <div className="text-xs truncate" style={{ color: C.sub }}>{subtitle}</div>}
      </div>
      {tag && (
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: color + '16', color }}>
          {tag}
        </span>
      )}
    </div>
  );
}

export function TabSection({
  title, subtitle, onAdd, addLabel, color, disabled, disabledText, empty, emptyText, emptyIcon: EmptyIcon, children,
}) {
  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.ink }}>{title}</h2>
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2.5 rounded-full disabled:opacity-40 shadow-sm"
          style={{ background: color }}
        >
          <Plus size={15} /> {addLabel}
        </button>
      </div>
      <p className="text-sm mb-5" style={{ color: C.sub }}>{disabled ? disabledText : subtitle}</p>
      {empty ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
          {EmptyIcon && (
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: color + '16' }}>
              <EmptyIcon size={20} style={{ color }} />
            </div>
          )}
          <div className="text-sm" style={{ color: C.sub }}>{emptyText}</div>
        </div>
      ) : children}
    </div>
  );
}
