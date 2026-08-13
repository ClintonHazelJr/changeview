import { useMemo, useState } from 'react';
import { Bell, Plus, ChevronDown } from 'lucide-react';
import { C, HEAD, BODY, tint, initials, STATUS_COLOR } from '../../lib/constants';
import { useAuth } from '../../contexts/AuthContext';
import ViewToggle from './ViewToggle';

export function statusColor(status) {
  return STATUS_COLOR[status] || C.sub;
}

/**
 * viewMode: 'tiles' | 'list' | 'board'
 * modes: which ViewToggle options to show (default tiles + list)
 */
export function ListTopBar({
  title, addLabel, onAdd, addDisabled,
  viewMode = 'tiles', onViewChange, viewModes = ['tiles', 'list'],
}) {
  const { profile } = useAuth();
  return (
    <div
      className="flex items-center gap-3 px-6 py-3 bg-white border-b shrink-0"
      style={{ ...BODY, borderColor: C.border }}
    >
      <h1 className="text-lg font-bold" style={{ ...HEAD, color: C.ink }}>{title}</h1>
      {typeof onViewChange === 'function' && (
        <ViewToggle value={viewMode} onChange={onViewChange} modes={viewModes} />
      )}
      <div className="flex-1" />
      <button
        type="button"
        onClick={onAdd}
        disabled={addDisabled}
        className="flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2 rounded-full disabled:opacity-40 shadow-sm"
        style={{ background: C.purple }}
      >
        <Plus size={15} /> {addLabel}
      </button>
      <button type="button" className="p-2 rounded-full" style={{ color: C.sub }} title="Notifications" disabled>
        <Bell size={16} />
      </button>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
        style={{ background: C.purple }}
        title={profile?.full_name || 'You'}
      >
        {initials(profile?.full_name)}
      </div>
    </div>
  );
}

export function StatusFilterRow({ statuses, counts, active, onSelect, onAddStatus }) {
  return (
    <div
      className="flex items-center gap-2 px-6 py-3 bg-white border-b overflow-x-auto shrink-0"
      style={{ borderColor: C.border }}
    >
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0"
        style={
          !active
            ? { background: tint(C.purple, '16'), borderColor: tint(C.purple, '40'), color: C.purple }
            : { background: '#fff', borderColor: C.border, color: C.sub }
        }
      >
        All · {Object.values(counts).reduce((a, b) => a + b, 0)}
      </button>
      {statuses.map((status) => {
        const color = statusColor(status.key || status);
        const selected = active === status.key;
        const Icon = status.icon;
        return (
          <button
            key={status.key}
            type="button"
            onClick={() => onSelect(status.key)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 capitalize"
            style={{
              background: tint(color, selected ? '28' : '14'),
              borderColor: tint(color, selected ? '55' : '30'),
              color,
            }}
          >
            {Icon && <Icon size={12} />}
            {status.label} · {counts[status.key] || 0}
          </button>
        );
      })}
      {onAddStatus && (
        <button
          type="button"
          onClick={onAddStatus}
          className="w-7 h-7 rounded-full border flex items-center justify-center shrink-0"
          style={{ borderColor: C.border, color: C.sub }}
          title="Add"
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}

export function StatusProgressBar({ items, getStatus }) {
  const segments = useMemo(() => {
    const counts = {};
    items.forEach((item) => {
      const s = getStatus(item) || 'unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    const total = items.length || 1;
    return Object.entries(counts).map(([status, count]) => ({
      status,
      count,
      pct: (count / total) * 100,
      color: statusColor(status),
    }));
  }, [items, getStatus]);

  if (!items.length) {
    return <div className="h-1.5 rounded-full flex-1" style={{ background: C.border }} />;
  }

  return (
    <div className="h-1.5 rounded-full flex-1 overflow-hidden flex" style={{ background: C.border }}>
      {segments.map((seg) => (
        <div key={seg.status} style={{ width: `${seg.pct}%`, background: seg.color }} title={`${seg.status}: ${seg.count}`} />
      ))}
    </div>
  );
}

export function GroupSection({ title, items, getStatus, addLabel, onAdd, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 mb-2 text-left"
      >
        <span className="text-sm font-bold shrink-0" style={{ ...HEAD, color: C.ink }}>{title}</span>
        <StatusProgressBar items={items} getStatus={getStatus} />
        <span className="text-[11px] font-semibold shrink-0" style={{ color: C.sub }}>{items.length}</span>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform"
          style={{ color: C.sub, transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
      </button>
      {open && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {children}
          </div>
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="mt-2 text-xs font-semibold"
              style={{ color: C.sub }}
            >
              + {addLabel}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function CompactListCard({
  title,
  subtitle,
  tags = [],
  avatars = [],
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-xl border p-3 text-left hover:shadow-sm transition-shadow w-full min-h-[88px] flex flex-col"
      style={{ borderColor: C.border }}
    >
      <div className="text-sm font-bold leading-snug line-clamp-2 mb-0.5" style={{ color: C.ink }}>{title}</div>
      {subtitle && (
        <div className="text-[11px] mb-2 line-clamp-1" style={{ color: C.sub }}>{subtitle}</div>
      )}
      <div className="mt-auto flex items-end justify-between gap-2">
        <div className="flex -space-x-1.5">
          {avatars.filter(Boolean).slice(0, 3).map((name) => (
            <div
              key={name}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white"
              style={{ background: C.purple }}
              title={name}
            >
              {initials(name)}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {tags.filter(Boolean).map((tag) => (
            <span
              key={`${tag.label}-${tag.color}`}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
              style={{ background: tint(tag.color || C.sub, '18'), color: tag.color || C.sub }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

export function ListPageShell({ children }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ ...BODY, background: C.bg }}>
      {children}
    </div>
  );
}

export function ListBody({ children, empty, emptyText }) {
  if (empty) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <div className="text-center py-14 bg-white rounded-2xl border border-dashed" style={{ borderColor: C.border }}>
          <div className="text-sm" style={{ color: C.sub }}>{emptyText}</div>
        </div>
      </div>
    );
  }
  return <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>;
}

export function countByStatus(items, getStatus, keys) {
  const counts = Object.fromEntries(keys.map((k) => [k, 0]));
  items.forEach((item) => {
    const s = getStatus(item);
    if (s in counts) counts[s] += 1;
  });
  return counts;
}
