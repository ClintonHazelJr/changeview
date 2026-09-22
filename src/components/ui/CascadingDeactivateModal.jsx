import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { C, inputClass, inputStyle } from '../../lib/constants';
import { Field } from './shared';
import Modal from './Modal';

/**
 * Two-step Org deactivation (reversible, but large cascade):
 * 1) Show counts of Departments / People / Programs affected
 * 2) Require typing the Org name
 */
export default function CascadingDeactivateModal({
  entityLabel = 'Org',
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
  const value = typed.trim();
  const canSubmit = value === recordName && !busy && !countsLoading;

  return (
    <Modal
      title={step === 1 ? `Deactivate ${entityLabel}?` : `Confirm deactivate ${entityLabel}`}
      onClose={busy ? () => {} : onClose}
    >
      {step === 1 ? (
        <>
          <div className="flex items-start gap-2.5 mb-4">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: C.coral }} />
            <p className="text-sm leading-relaxed" style={{ color: C.sub }}>
              Deactivating <strong style={{ color: C.ink }}>{recordName}</strong> cascades to every
              Department and Person under it, and archives its Programs (and everything under those).
              Nothing is permanently deleted — but reactivation of this {entityLabel.toLowerCase()}{' '}
              will <strong style={{ color: C.ink }}>not</strong> restore children automatically.
            </p>
          </div>
          <div className="rounded-2xl border p-4 mb-5" style={{ borderColor: C.border, background: C.bg }}>
            <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>
              What will be affected
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
            Type the {entityLabel.toLowerCase()} name{' '}
            (<strong style={{ color: C.ink }}>{recordName}</strong>) to confirm deactivation.
          </p>
          <Field label={`Type “${recordName}”`}>
            <input
              className={inputClass}
              style={inputStyle}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={recordName}
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
              {busy ? 'Deactivating…' : `Deactivate ${entityLabel}`}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
