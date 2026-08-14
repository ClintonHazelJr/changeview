import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ClipboardList, FileText, Grid3X3, Download, Loader2 } from 'lucide-react';
import { C, HEAD, BODY, SEVERITY_COLOR, STATUS_COLOR, tint, isRatedSeverity } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { exportElementToPdf } from '../../lib/exportReportPdf';

const SEV_SCORE = { none: 0, low: 1, medium: 2, high: 3 };
const SEV_COLS = [
  { key: 'severity_org', label: 'Org' },
  { key: 'severity_people', label: 'People' },
  { key: 'severity_process', label: 'Process' },
  { key: 'severity_system', label: 'System' },
  { key: 'severity_environment', label: 'Environment' },
];

const REPORTS = [
  {
    key: 'requirements',
    title: 'Requirements list',
    desc: 'Every requirement in this workspace, filterable by initiative and status.',
    icon: ClipboardList,
    color: C.amber,
    file: 'requirements-list.pdf',
  },
  {
    key: 'cia',
    title: 'Change Impact Assessment',
    desc: 'Document-style assessment of impacts and learning needs for one initiative.',
    icon: FileText,
    color: C.coral,
    file: 'change-impact-assessment.pdf',
  },
  {
    key: 'heatmap',
    title: 'Impact heat map',
    desc: 'Departments × severity categories — where change pressure concentrates.',
    icon: Grid3X3,
    color: C.teal,
    file: 'impact-heat-map.pdf',
  },
];

/** Single-hue blue ramp: light trust tint → navy (darker = higher score). */
function cellColor(score, max) {
  if (!score || !max) return C.trust;
  const t = Math.min(1, score / max);
  const a = Math.round(28 + t * 200).toString(16).padStart(2, '0');
  return `${C.navy}${a}`;
}

function ExportBar({ exportRef, filename, disabled }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={async () => {
        if (!exportRef?.current) return;
        setBusy(true);
        try {
          await exportElementToPdf(exportRef.current, filename);
        } catch (err) {
          alert(err.message || 'Export failed');
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2 rounded-full disabled:opacity-50"
      style={{ background: C.purple }}
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
      {busy ? 'Exporting…' : 'Export PDF'}
    </button>
  );
}

function RequirementsReport({ workspaceId, exportRef }) {
  const [rows, setRows] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [people, setPeople] = useState([]);
  const [initiativeFilter, setInitiativeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [r, i, p] = await Promise.all([
        supabase.from('requirements').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
        supabase.from('initiatives').select('id, name').eq('workspace_id', workspaceId).order('name'),
        supabase.from('people').select('id, name').eq('workspace_id', workspaceId),
      ]);
      if (cancelled) return;
      setRows(r.data || []);
      setInitiatives(i.data || []);
      setPeople(p.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [workspaceId]);

  const initName = (id) => initiatives.find((x) => x.id === id)?.name || '—';
  const personName = (id) => people.find((x) => x.id === id)?.name || '—';

  const filtered = rows.filter((r) => {
    if (initiativeFilter && r.initiative_id !== initiativeFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  if (loading) return <p className="text-sm" style={{ color: C.sub }}>Loading…</p>;

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <select className="text-sm rounded-xl border px-3 py-2" style={{ borderColor: C.border, color: C.ink }} value={initiativeFilter} onChange={(e) => setInitiativeFilter(e.target.value)}>
          <option value="">All initiatives</option>
          {initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select className="text-sm rounded-xl border px-3 py-2" style={{ borderColor: C.border, color: C.ink }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['draft', 'approved', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div ref={exportRef} className="bg-white rounded-2xl border overflow-x-auto p-4" style={{ borderColor: C.border }}>
        <div className="mb-3 px-1">
          <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.sub }}>ChangeView</div>
          <h3 className="text-lg font-extrabold" style={{ ...HEAD, color: C.ink }}>Requirements list</h3>
        </div>
        <table className="w-full text-sm text-left min-w-[900px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide border-b" style={{ color: C.sub, borderColor: C.border, background: C.bg }}>
              {['Initiative', 'Number', 'Description', 'Status', 'Priority', 'Author', 'Business Approver'].map((h) => (
                <th key={h} className="px-3 py-2.5 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center" style={{ color: C.sub }}>No requirements match.</td></tr>
            ) : filtered.map((r) => {
              const statusColor = STATUS_COLOR[r.status] || C.sub;
              const priorityColor = SEVERITY_COLOR[r.priority] || C.sub;
              return (
                <tr key={r.id} className="border-b align-top" style={{ borderColor: C.border }}>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: C.ink }}>{initName(r.initiative_id)}</td>
                  <td className="px-3 py-2.5" style={{ color: C.sub }}>{r.reference_number || '—'}</td>
                  <td className="px-3 py-2.5" style={{ color: C.ink }}>{r.description || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: tint(statusColor, '22'), color: statusColor }}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {r.priority ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: tint(priorityColor, '22'), color: priorityColor }}>
                        {r.priority}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2.5" style={{ color: C.ink }}>{personName(r.author_id)}</td>
                  <td className="px-3 py-2.5" style={{ color: C.ink }}>{personName(r.business_approver_id)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CiaReport({ workspaceId, exportRef }) {
  const [initiatives, setInitiatives] = useState([]);
  const [initiativeId, setInitiativeId] = useState('');
  const [impacts, setImpacts] = useState([]);
  const [learning, setLearning] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('initiatives').select('id, name, description, status, proposed_go_live_date').eq('workspace_id', workspaceId).order('name');
      if (cancelled) return;
      setInitiatives(data || []);
      if (data?.[0] && !initiativeId) setInitiativeId(data[0].id);
    })();
    return () => { cancelled = true; };
  }, [workspaceId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!initiativeId) {
        setImpacts([]);
        setLearning([]);
        return;
      }
      setLoading(true);
      const [imp, ln, dept] = await Promise.all([
        supabase.from('impacts').select('*').eq('initiative_id', initiativeId).order('created_at'),
        supabase.from('learning_needs').select('*').eq('workspace_id', workspaceId).order('created_at'),
        supabase.from('departments').select('id, name').eq('workspace_id', workspaceId),
      ]);
      if (cancelled) return;
      const impactRows = imp.data || [];
      setImpacts(impactRows);
      const impactIds = new Set(impactRows.map((i) => i.id));
      setLearning((ln.data || []).filter((l) => impactIds.has(l.impact_id)));
      setDepartments(dept.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [initiativeId, workspaceId]);

  const initiative = initiatives.find((i) => i.id === initiativeId);
  const deptName = (id) => departments.find((d) => d.id === id)?.name || '—';

  return (
    <div>
      <div className="mb-4">
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

      {loading ? (
        <p className="text-sm" style={{ color: C.sub }}>Loading…</p>
      ) : !initiative ? (
        <p className="text-sm" style={{ color: C.sub }}>No initiatives in this workspace.</p>
      ) : (
        <article
          ref={exportRef}
          className="bg-white rounded-3xl border shadow-sm p-10 max-w-3xl"
          style={{ borderColor: C.border }}
        >
          <header className="border-b pb-5 mb-8" style={{ borderColor: C.border }}>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: C.sub }}>
              ChangeView · Change Impact Assessment
            </div>
            <h3 className="text-2xl font-extrabold mb-2" style={{ ...HEAD, color: C.ink }}>{initiative.name}</h3>
            <div className="flex flex-wrap gap-3 text-xs mb-3" style={{ color: C.sub }}>
              {initiative.status && <span className="capitalize">Status: {initiative.status}</span>}
              {initiative.proposed_go_live_date && (
                <span>Proposed go-live: {initiative.proposed_go_live_date}</span>
              )}
              <span>Prepared {new Date().toLocaleDateString()}</span>
            </div>
            {initiative.description && (
              <p className="text-sm leading-relaxed" style={{ color: C.ink }}>{initiative.description}</p>
            )}
          </header>

          <section className="mb-8">
            <h4 className="text-sm font-extrabold uppercase tracking-wide mb-2" style={{ ...HEAD, color: C.ink }}>
              Executive summary
            </h4>
            <p className="text-sm leading-relaxed" style={{ color: C.sub }}>
              This assessment covers {impacts.length} impact area{impacts.length === 1 ? '' : 's'} and {learning.length} learning need{learning.length === 1 ? '' : 's'}
              {' '}for {initiative.name}. Use it to brief stakeholders on who is affected, how severely, and what training is planned.
            </p>
          </section>

          {impacts.length === 0 ? (
            <p className="text-sm" style={{ color: C.sub }}>No impacts recorded for this initiative.</p>
          ) : impacts.map((imp, idx) => {
            const linked = learning.filter((l) => l.impact_id === imp.id);
            return (
              <section key={imp.id} className={`${idx > 0 ? 'border-t pt-7 mt-7' : ''}`} style={{ borderColor: C.border }}>
                <h4 className="text-base font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>
                  {idx + 1}. {deptName(imp.department_id)}
                  {imp.headcount_impacted != null && (
                    <span className="text-sm font-semibold ml-2" style={{ color: C.sub }}>· {imp.headcount_impacted} impacted</span>
                  )}
                </h4>
                {imp.status && (
                  <div className="mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: tint(STATUS_COLOR[imp.status] || C.sub, '22'), color: STATUS_COLOR[imp.status] || C.sub }}>
                      {imp.status}
                    </span>
                  </div>
                )}
                {imp.impact_description && (
                  <p className="text-sm mb-4 leading-relaxed" style={{ color: C.ink }}>{imp.impact_description}</p>
                )}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="rounded-2xl p-3" style={{ background: C.bg }}>
                    <div className="text-[11px] font-bold uppercase mb-1" style={{ color: C.sub }}>Current state</div>
                    <p className="text-sm mb-1" style={{ color: C.ink }}><span style={{ color: C.sub }}>System:</span> {imp.current_state_system || '—'}</p>
                    <p className="text-sm" style={{ color: C.ink }}><span style={{ color: C.sub }}>Process:</span> {imp.current_state_process || '—'}</p>
                  </div>
                  <div className="rounded-2xl p-3" style={{ background: C.bg }}>
                    <div className="text-[11px] font-bold uppercase mb-1" style={{ color: C.sub }}>Future state</div>
                    <p className="text-sm mb-1" style={{ color: C.ink }}><span style={{ color: C.sub }}>System:</span> {imp.future_state_system || '—'}</p>
                    <p className="text-sm" style={{ color: C.ink }}><span style={{ color: C.sub }}>Process:</span> {imp.future_state_process || '—'}</p>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-[11px] font-bold uppercase mb-2" style={{ color: C.sub }}>Severity</div>
                  <div className="flex flex-wrap gap-2">
                    {SEV_COLS.map(({ key, label }) => {
                      const v = imp[key] || 'none';
                      const show = isRatedSeverity(v);
                      return (
                        <span
                          key={key}
                          className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                          style={{
                            background: show ? tint(SEVERITY_COLOR[v], '22') : C.bg,
                            color: show ? SEVERITY_COLOR[v] : C.sub,
                          }}
                        >
                          {label}: {v === 'none' ? 'No Impact' : v}
                        </span>
                      );
                    })}
                  </div>
                </div>
                {(imp.intervention_tags || []).length > 0 && (
                  <div className="mb-3">
                    <div className="text-[11px] font-bold uppercase mb-1" style={{ color: C.sub }}>Interventions</div>
                    <p className="text-sm capitalize" style={{ color: C.ink }}>{(imp.intervention_tags || []).join(', ')}</p>
                  </div>
                )}
                {linked.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase mb-2" style={{ color: C.sub }}>Learning needs</div>
                    <ul className="space-y-1.5">
                      {linked.map((l) => (
                        <li key={l.id} className="text-sm" style={{ color: C.ink }}>
                          <strong>{l.team || 'Team'}</strong>
                          {l.goal ? ` — ${l.goal}` : ''}
                          <span style={{ color: C.sub }}>
                            {' '}· {l.type || 'Training'} · {l.headcount || 0} people · {l.session_count || 0} sessions · {l.time_hours || 0}h
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            );
          })}
        </article>
      )}
    </div>
  );
}

function HeatMapReport({ workspaceId, exportRef }) {
  const [cells, setCells] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [impacts, departments] = await Promise.all([
        supabase.from('impacts').select('department_id, severity_org, severity_people, severity_process, severity_system, severity_environment').eq('workspace_id', workspaceId),
        supabase.from('departments').select('id, name').eq('workspace_id', workspaceId).order('name'),
      ]);
      if (cancelled) return;

      const deptMap = Object.fromEntries((departments.data || []).map((d) => [d.id, d.name]));
      const sums = {};
      (impacts.data || []).forEach((imp) => {
        const deptId = imp.department_id || '_none';
        if (!sums[deptId]) {
          sums[deptId] = {
            id: deptId,
            name: deptMap[deptId] || 'Unassigned',
            severity_org: 0,
            severity_people: 0,
            severity_process: 0,
            severity_system: 0,
            severity_environment: 0,
          };
        }
        SEV_COLS.forEach(({ key }) => {
          sums[deptId][key] += SEV_SCORE[imp[key]] ?? 0;
        });
      });
      setCells(Object.values(sums).sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [workspaceId]);

  const max = useMemo(() => {
    let m = 0;
    cells.forEach((row) => {
      SEV_COLS.forEach(({ key }) => { m = Math.max(m, row[key] || 0); });
    });
    return m || 1;
  }, [cells]);

  if (loading) return <p className="text-sm" style={{ color: C.sub }}>Loading…</p>;
  if (cells.length === 0) return <p className="text-sm" style={{ color: C.sub }}>No impacts to map yet.</p>;

  return (
    <div ref={exportRef} className="bg-white rounded-2xl border overflow-x-auto p-4" style={{ borderColor: C.border }}>
      <div className="mb-3 px-1">
        <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.sub }}>ChangeView</div>
        <h3 className="text-lg font-extrabold" style={{ ...HEAD, color: C.ink }}>Impact heat map</h3>
      </div>
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="border-b" style={{ borderColor: C.border, background: C.bg }}>
            <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase" style={{ color: C.sub }}>Department</th>
            {SEV_COLS.map(({ label }) => (
              <th key={label} className="px-3 py-2.5 text-center text-[11px] font-bold uppercase" style={{ color: C.sub }}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cells.map((row) => (
            <tr key={row.id} className="border-b" style={{ borderColor: C.border }}>
              <td className="px-3 py-2 font-semibold" style={{ color: C.ink }}>{row.name}</td>
              {SEV_COLS.map(({ key }) => (
                <td key={key} className="px-2 py-2 text-center">
                  <div
                    className="mx-auto rounded-lg py-2 font-bold text-xs"
                    style={{
                      background: cellColor(row[key], max),
                      color: row[key] > max * 0.45 ? '#fff' : C.ink,
                      minWidth: 48,
                    }}
                    title={`Sum severity score: ${row[key]}`}
                  >
                    {row[key]}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-3 text-[11px]" style={{ color: C.sub }}>
        Cell values are summed severity scores across impacts (none=0, low=1, medium=2, high=3). Darker cells = higher cumulative impact.
      </p>
    </div>
  );
}

export default function ReportsPanel() {
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const [active, setActive] = useState(null);
  const exportRef = useRef(null);
  const meta = REPORTS.find((r) => r.key === active);

  if (!activeWorkspaceId) {
    return (
      <div className="flex-1 p-8" style={BODY}>
        <p className="text-sm" style={{ color: C.sub }}>Select a workspace to view reports.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 max-w-6xl w-full mx-auto overflow-y-auto" style={BODY}>
      {!active ? (
        <>
          <div
            className="rounded-3xl p-6 mb-7"
            style={{ background: `linear-gradient(120deg, ${tint(C.purple, '14')}, ${tint(C.teal, '12')})` }}
          >
            <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Reports — {activeWorkspace?.name}</h2>
            <p className="text-sm" style={{ color: C.sub }}>Choose a report to run for this workspace.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {REPORTS.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setActive(r.key)}
                className="text-left rounded-3xl p-5 text-white shadow-sm hover:opacity-95 transition-opacity"
                style={{ background: r.color }}
              >
                <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center mb-3">
                  <r.icon size={18} />
                </div>
                <div className="text-sm font-extrabold mb-1" style={HEAD}>{r.title}</div>
                <p className="text-xs opacity-90">{r.desc}</p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => setActive(null)}
              className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: C.purple }}
            >
              <ArrowLeft size={14} /> All reports
            </button>
            <div className="flex-1" />
            <ExportBar exportRef={exportRef} filename={meta?.file || 'report.pdf'} />
          </div>
          <h2 className="text-xl font-extrabold mb-4" style={{ ...HEAD, color: C.ink }}>
            {meta?.title}
          </h2>
          {active === 'requirements' && <RequirementsReport workspaceId={activeWorkspaceId} exportRef={exportRef} />}
          {active === 'cia' && <CiaReport workspaceId={activeWorkspaceId} exportRef={exportRef} />}
          {active === 'heatmap' && <HeatMapReport workspaceId={activeWorkspaceId} exportRef={exportRef} />}
        </>
      )}
    </div>
  );
}
