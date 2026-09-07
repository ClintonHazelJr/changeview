import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import { C, HEAD, BODY, tint, inputClass, inputStyle, parseDbError } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { computeStatusReportSnapshot } from '../../lib/statusReportSnapshot';
import { Field } from '../ui/shared';

const RAG = {
  green: { label: 'Green', color: '#16A34A' },
  amber: { label: 'Amber', color: '#F59E0B' },
  red: { label: 'Red', color: '#ff1717' },
};

function formatMoney(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatStamp(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function RagDot({ status, size = 12 }) {
  const color = RAG[status]?.color || C.sub;
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, background: color }}
      title={RAG[status]?.label || status}
    />
  );
}

function RagBadge({ status }) {
  const meta = RAG[status] || { label: status, color: C.sub };
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: tint(meta.color, '22'), color: meta.color }}
    >
      <RagDot status={status} size={8} />
      {meta.label}
    </span>
  );
}

function MetricCard({ label, value, emphasize = false }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: emphasize ? C.red : C.border,
        background: emphasize ? tint(C.red, '10') : '#fff',
      }}
    >
      <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: C.sub }}>
        {label}
      </div>
      <div className="text-2xl font-extrabold tabular-nums" style={{ ...HEAD, color: emphasize ? C.red : C.ink }}>
        {value}
      </div>
    </div>
  );
}

function CreateForm({
  workspaceId, scope, initiativeId, programId, onCancel, onSaved,
}) {
  const { profile } = useAuth();
  const [rag, setRag] = useState('green');
  const [highlights, setHighlights] = useState('');
  const [risks, setRisks] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!profile?.account_id) throw new Error('Not signed in.');
      const targetId = scope === 'initiative' ? initiativeId : programId;
      if (!targetId) throw new Error(scope === 'initiative' ? 'Select an Initiative.' : 'Select a Program.');

      const snapshot = await computeStatusReportSnapshot(workspaceId, {
        type: scope,
        id: targetId,
      });

      const { data, error: insertErr } = await supabase
        .from('status_reports')
        .insert({
          account_id: profile.account_id,
          workspace_id: workspaceId,
          initiative_id: scope === 'initiative' ? initiativeId : null,
          program_id: scope === 'program' ? programId : null,
          rag_status: rag,
          highlights: highlights.trim() || null,
          risks_blockers: risks.trim() || null,
          created_by: profile.id || null,
          ...snapshot,
        })
        .select()
        .single();
      if (insertErr) throw new Error(parseDbError(insertErr));
      onSaved(data);
    } catch (err) {
      setError(err.message || 'Could not save status report');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="bg-white rounded-2xl border p-5 mb-5" style={{ borderColor: C.border, ...BODY }}>
      <h3 className="text-base font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>New status report</h3>
      <p className="text-xs mb-4" style={{ color: C.sub }}>
        Set RAG and a short narrative. Completion and budget numbers freeze at save time.
      </p>

      <Field label="RAG status">
        <div className="flex flex-wrap gap-2">
          {Object.entries(RAG).map(([key, meta]) => (
            <button
              key={key}
              type="button"
              onClick={() => setRag(key)}
              className="inline-flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-full border"
              style={{
                borderColor: rag === key ? meta.color : C.border,
                background: rag === key ? tint(meta.color, '18') : '#fff',
                color: rag === key ? meta.color : C.ink,
              }}
            >
              <RagDot status={key} />
              {meta.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Highlights">
        <textarea
          rows={3}
          className={inputClass}
          style={inputStyle}
          value={highlights}
          onChange={(e) => setHighlights(e.target.value)}
          placeholder="What's gone well since the last report…"
        />
      </Field>

      <Field label="Risks / Blockers">
        <textarea
          rows={3}
          className={inputClass}
          style={inputStyle}
          value={risks}
          onChange={(e) => setRisks(e.target.value)}
          placeholder="What's at risk or stuck right now…"
        />
      </Field>

      {error && <p className="text-xs mb-3" style={{ color: C.coral }}>{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="text-sm font-semibold px-4 py-2 rounded-full"
          style={{ color: C.sub }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="text-sm font-bold text-white px-4 py-2 rounded-full disabled:opacity-50"
          style={{ background: C.navy }}
        >
          {busy ? 'Saving snapshot…' : 'Save snapshot'}
        </button>
      </div>
    </form>
  );
}

function ReportDetail({ report, scopeLabel, exportRef }) {
  return (
    <div ref={exportRef} className="bg-white rounded-2xl border p-6" style={{ borderColor: C.border, ...BODY }}>
      <div className="mb-5">
        <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.sub }}>ChangeView</div>
        <h3 className="text-xl font-extrabold mt-1" style={{ ...HEAD, color: C.ink }}>Change Status Report</h3>
        <p className="text-sm mt-1" style={{ color: C.sub }}>{scopeLabel}</p>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <RagBadge status={report.rag_status} />
          <span className="text-sm" style={{ color: C.sub }}>{formatStamp(report.created_at)}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <div className="rounded-2xl border p-4" style={{ borderColor: C.border, background: C.bg }}>
          <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>Highlights</div>
          <p className="text-sm whitespace-pre-wrap" style={{ color: C.ink }}>
            {report.highlights || '—'}
          </p>
        </div>
        <div className="rounded-2xl border p-4" style={{ borderColor: C.border, background: tint(C.red, '08') }}>
          <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>Risks / Blockers</div>
          <p className="text-sm whitespace-pre-wrap" style={{ color: C.ink }}>
            {report.risks_blockers || '—'}
          </p>
        </div>
      </div>

      <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>
        Snapshot metrics
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <MetricCard label="Requirements complete" value={`${Number(report.requirements_completion_pct) || 0}%`} />
        <MetricCard label="Tasks done" value={`${Number(report.task_completion_pct) || 0}%`} />
        <MetricCard
          label="Blocked tasks"
          value={Number(report.blocked_task_count) || 0}
          emphasize={(Number(report.blocked_task_count) || 0) > 0}
        />
        <MetricCard label="Change readiness" value={`${Number(report.change_readiness_pct) || 0}%`} />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <MetricCard label="High-severity impacts" value={Number(report.high_severity_impact_count) || 0} />
        <MetricCard label="Budget planned" value={formatMoney(report.budget_planned)} />
        <MetricCard label="Budget actual" value={formatMoney(report.budget_actual)} />
      </div>
      <p className="text-[11px] mt-4" style={{ color: C.sub }}>
        Metrics frozen at save — not recalculated. Change readiness is based on training task completion.
      </p>
    </div>
  );
}

export default function StatusReportPanel({ workspaceId, exportRef }) {
  const [scope, setScope] = useState('initiative');
  const [initiatives, setInitiatives] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [initiativeId, setInitiativeId] = useState('');
  const [programId, setProgramId] = useState('');
  const [reports, setReports] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [initRes, progRes] = await Promise.all([
        supabase.from('initiatives').select('id, name, program_id, workspace_id').eq('workspace_id', workspaceId).order('name'),
        supabase.from('programs').select('id, name, workspace_id').eq('workspace_id', workspaceId).order('name'),
      ]);
      if (cancelled) return;
      const initRows = initRes.data || [];
      const progRows = progRes.data || [];
      setInitiatives(initRows);
      setPrograms(progRows);
      if (initRows[0]) setInitiativeId((prev) => prev || initRows[0].id);
      if (progRows[0]) setProgramId((prev) => prev || progRows[0].id);
    })();
    return () => { cancelled = true; };
  }, [workspaceId]);

  const loadReports = useCallback(async () => {
    if (scope === 'initiative' && !initiativeId) {
      setReports([]);
      return;
    }
    if (scope === 'program' && !programId) {
      setReports([]);
      return;
    }
    setLoading(true);
    let q = supabase
      .from('status_reports')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (scope === 'initiative') q = q.eq('initiative_id', initiativeId);
    else q = q.eq('program_id', programId);
    const { data, error } = await q;
    if (error) {
      console.error(error);
      setReports([]);
    } else {
      setReports(data || []);
    }
    setLoading(false);
  }, [workspaceId, scope, initiativeId, programId]);

  useEffect(() => {
    setSelectedId(null);
    setCreating(false);
    loadReports();
  }, [loadReports]);

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) || null,
    [reports, selectedId],
  );

  const scopeLabel = scope === 'program'
    ? (programs.find((p) => p.id === programId)?.name || 'Program')
    : (initiatives.find((i) => i.id === initiativeId)?.name || 'Initiative');

  const trend = useMemo(
    () => [...reports].reverse(),
    [reports],
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: C.sub }}>Scope</label>
          <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: C.border }}>
            {[
              { key: 'initiative', label: 'Initiative' },
              { key: 'program', label: 'Program' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setScope(opt.key)}
                className="text-sm font-semibold px-3 py-2"
                style={{
                  background: scope === opt.key ? C.navy : '#fff',
                  color: scope === opt.key ? '#fff' : C.ink,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {scope === 'initiative' ? (
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: C.sub }}>Initiative</label>
            <select
              className="text-sm rounded-xl border px-3 py-2 min-w-[260px]"
              style={{ borderColor: C.border, color: C.ink }}
              value={initiativeId}
              onChange={(e) => setInitiativeId(e.target.value)}
            >
              {initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: C.sub }}>Program</label>
            <select
              className="text-sm rounded-xl border px-3 py-2 min-w-[260px]"
              style={{ borderColor: C.border, color: C.ink }}
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
            >
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div className="flex-1" />
        {!creating && !selected && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2 rounded-full"
            style={{ background: C.navy }}
          >
            <Plus size={15} /> New report
          </button>
        )}
      </div>

      {creating && (
        <CreateForm
          workspaceId={workspaceId}
          scope={scope}
          initiativeId={initiativeId}
          programId={programId}
          onCancel={() => setCreating(false)}
          onSaved={(row) => {
            setCreating(false);
            setReports((prev) => [row, ...prev]);
            setSelectedId(row.id);
          }}
        />
      )}

      {selected ? (
        <div>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold mb-3"
            style={{ color: C.navy }}
          >
            <ArrowLeft size={14} /> All snapshots
          </button>
          <ReportDetail report={selected} scopeLabel={scopeLabel} exportRef={exportRef} />
        </div>
      ) : (
        <>
          {trend.length > 1 && (
            <div className="bg-white rounded-2xl border p-4 mb-4" style={{ borderColor: C.border }}>
              <div className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: C.sub }}>
                RAG over time
              </div>
              <div className="flex flex-wrap items-end gap-4">
                {trend.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className="flex flex-col items-center gap-1.5 min-w-[48px]"
                  >
                    <RagDot status={r.rag_status} size={14} />
                    <span className="text-[10px]" style={{ color: C.sub }}>{formatShortDate(r.created_at)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-sm" style={{ color: C.sub }}>Loading…</p>
          ) : reports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed p-8 text-center" style={{ borderColor: C.border }}>
              <p className="text-sm mb-3" style={{ color: C.sub }}>
                No status reports yet for {scopeLabel}. Create a weekly snapshot for SteerCo.
              </p>
              {!creating && (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2 rounded-full"
                  style={{ background: C.navy }}
                >
                  <Plus size={15} /> New report
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: C.border }}>
              <ul>
                {reports.map((r) => (
                  <li key={r.id} className="border-b last:border-b-0" style={{ borderColor: C.border }}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-black/[0.02]"
                    >
                      <RagDot status={r.rag_status} size={12} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold" style={{ color: C.ink }}>{formatStamp(r.created_at)}</div>
                        <div className="text-xs truncate" style={{ color: C.sub }}>
                          {r.highlights || r.risks_blockers || 'No narrative'}
                        </div>
                      </div>
                      <RagBadge status={r.rag_status} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
