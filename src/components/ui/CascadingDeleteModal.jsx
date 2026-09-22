import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { C, inputClass, inputStyle } from '../../lib/constants';
import { Field } from './shared';
import Modal from './Modal';

/**
 * Two-step permanent delete:
 * 1) Show cascading child counts
 * 2) Require typing DELETE or the record name
 */
export default function CascadingDeleteModal({
  entityLabel,
  recordName,
  counts = [],
  countsLoading = false,
  busy = false,
  error = '',
  onClose,
  onConfirm,
}) {
  const [step, setStep] = useState(1);
  const [typed, setTyped] = useState('');
  const confirmWord = 'DELETE';
  const value = typed.trim();
  const canSubmit = (value === confirmWord || value === recordName) && !busy && !countsLoading;

  return (
    <Modal
      title={step === 1 ? `Delete ${entityLabel}?` : `Confirm delete ${entityLabel}`}
      onClose={busy ? () => {} : onClose}
    >
      {step === 1 ? (
        <>
          <div className="flex items-start gap-2.5 mb-4">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: C.coral }} />
            <p className="text-sm leading-relaxed" style={{ color: C.sub }}>
              This permanently deletes <strong style={{ color: C.ink }}>{recordName}</strong> and
              everything under it. This cannot be undone. Archive instead if you only want to hide it.
            </p>
          </div>
          <div className="rounded-2xl border p-4 mb-5" style={{ borderColor: C.border, background: C.bg }}>
            <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>
              What will be deleted
            </div>
            {countsLoading ? (
              <p className="text-sm" style={{ color: C.sub }}>Counting related records…</p>
            ) : (
              <ul className="space-y-1.5">
                {counts.map((row) => (
                  <li key={row.label} className="flex items-center justify-between text-sm">
                    <span style={{ color: C.ink }}>{row.label}</span>
                    <span className="font-bold tabular-nums" style={{ color: row.count > 0 ? C.coral : C.sub }}>
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <p className="text-xs mb-3" style={{ color: C.coral }}>{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="text-sm font-semibold px-4 py-2 rounded-full"
              style={{ color: C.sub }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={countsLoading || busy}
              onClick={() => setStep(2)}
              className="text-sm font-bold text-white px-4 py-2 rounded-full disabled:opacity-40"
              style={{ background: C.coral }}
            >
              Continue
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm mb-4 leading-relaxed" style={{ color: C.sub }}>
            Type <strong style={{ color: C.ink }}>{confirmWord}</strong> or the {entityLabel.toLowerCase()} name
            {' '}(<strong style={{ color: C.ink }}>{recordName}</strong>) to permanently delete it.
          </p>
          <Field label={`Type ${confirmWord} or “${recordName}”`}>
            <input
              className={inputClass}
              style={inputStyle}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmWord}
              autoFocus
              disabled={busy}
              autoComplete="off"
            />
          </Field>
          {error && <p className="text-xs mb-3" style={{ color: C.coral }}>{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep(1)}
              className="text-sm font-semibold px-4 py-2 rounded-full"
              style={{ color: C.sub }}
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => onConfirm(value)}
              className="text-sm font-bold text-white px-4 py-2 rounded-full disabled:opacity-40"
              style={{ background: C.coral }}
            >
              {busy ? 'Deleting…' : `Delete ${entityLabel} forever`}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
