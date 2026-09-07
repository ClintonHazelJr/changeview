import { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { C } from '../../lib/constants';
import ViewToggle from './ViewToggle';

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

export function SaveRow({ label = 'Save', disabled, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 mt-2 sticky bottom-0 bg-white pt-2">
      <div className="min-h-[28px]">
        {onDelete && !confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-xs font-semibold"
            style={{ color: C.coral }}
          >
            Delete
          </button>
        )}
        {onDelete && confirmDelete && (
          <div className="flex items-center gap-2 text-xs">
            <span style={{ color: C.sub }}>Delete this record?</span>
            <button type="button" onClick={onDelete} className="font-bold" style={{ color: C.coral }}>Yes, delete</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="font-semibold" style={{ color: C.sub }}>Cancel</button>
          </div>
        )}
      </div>
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

export function ListCard({ icon: Icon, color, title, subtitle, tag, onClick }) {
  const body = (
    <>
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="text-sm font-bold truncate" style={{ color: C.ink }}>{title}</div>
        {subtitle && <div className="text-xs truncate" style={{ color: C.sub }}>{subtitle}</div>}
      </div>
      {tag && (
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: color + '16', color }}>
          {tag}
        </span>
      )}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-3 w-full hover:brightness-[0.99]"
        style={{ borderColor: C.border }}
      >
        {body}
      </button>
    );
  }
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-3" style={{ borderColor: C.border }}>
      {body}
    </div>
  );
}

export function TabSection({
  title, subtitle, onAdd, addLabel, color, disabled, disabledText, empty, emptyText, emptyIcon: EmptyIcon,
  viewMode, onViewChange, viewModes = ['tiles', 'list'], children,
  onBulkUpload, bulkLabel = 'Bulk Upload',
}) {
  return (
    <div>
      <div className="flex items-start justify-between mb-1 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.ink }}>{title}</h2>
          {typeof onViewChange === 'function' && !empty && (
            <ViewToggle value={viewMode || 'tiles'} onChange={onViewChange} modes={viewModes} />
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {typeof onBulkUpload === 'function' && (
            <button
              type="button"
              onClick={onBulkUpload}
              disabled={disabled}
              className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-full border disabled:opacity-40 shadow-sm"
              style={{ borderColor: C.border, color: C.ink, background: '#fff' }}
            >
              <Upload size={15} /> {bulkLabel}
            </button>
          )}
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
