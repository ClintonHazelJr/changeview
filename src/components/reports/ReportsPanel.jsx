import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ClipboardList, FileText, Grid3X3, CalendarRange, Download, Loader2 } from 'lucide-react';
import { C, HEAD, BODY, SEVERITY_COLOR, STATUS_COLOR, tint, isRatedSeverity, stripInitiativeMeta } from '../../lib/constants';
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
    desc: 'Impacts and learning needs for one initiative, or every initiative under a program.',
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
  {
    key: 'schedule',
    title: 'Schedule Report',
    desc: 'Dated Program → Initiative → Task / Hypercare timeline with Comms and go-live milestones.',
    icon: CalendarRange,
    color: C.navy,
    file: 'schedule-report.pdf',
  },
];

function formatReportDate(value) {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function dateRangeLabel(start, end) {
  if (!start && !end) return 'No dates set';
  if (start && end) return `${formatReportDate(start)} → ${formatReportDate(end)}`;
  return formatReportDate(start || end);
}

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

function CiaInitiativeBody({ initiative, impacts, learning, departments, people, headingLevel = 'h3' }) {
  const deptName = (id) => departments.find((d) => d.id === id)?.name || '—';
  const personName = (id) => (id && people.find((p) => p.id === id)?.name) || '';
  const description = stripInitiativeMeta(initiative.description);
  const owners = [
    ['Change Owner', personName(initiative.change_owner_id)],
    ['Product Owner', personName(initiative.product_owner_id)],
    ['Business Owner', personName(initiative.business_owner_id)],
    ['Project Manager', personName(initiative.project_manager_id)],
  ].filter(([, name]) => name);
  const TitleTag = headingLevel;

  return (
    <>
      <header className="border-b pb-5 mb-8" style={{ borderColor: C.border }}>
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: C.sub }}>
          ChangeView · Change Impact Assessment
        </div>
        <TitleTag className="text-2xl font-extrabold mb-2" style={{ ...HEAD, color: C.ink }}>{initiative.name}</TitleTag>
        <div className="flex flex-wrap gap-3 text-xs mb-3" style={{ color: C.sub }}>
          {initiative.status && <span className="capitalize">Status: {initiative.status}</span>}
          {initiative.proposed_go_live_date && (
            <span>Proposed go-live: {initiative.proposed_go_live_date}</span>
          )}
          <span>Prepared {new Date().toLocaleDateString()}</span>
        </div>
        {owners.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-3" style={{ color: C.ink }}>
            {owners.map(([label, name]) => (
              <span key={label}><span style={{ color: C.sub }}>{label}:</span> {name}</span>
            ))}
          </div>
        )}
        {description && (
          <p className="text-sm leading-relaxed" style={{ color: C.ink }}>{description}</p>
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
    </>
  );
}

function CiaReport({ workspaceId, exportRef }) {
  const [scope, setScope] = useState('initiative');
  const [programs, setPrograms] = useState([]);
  const [programId, setProgramId] = useState('');
  const [initiatives, setInitiatives] = useState([]);
  const [initiativeId, setInitiativeId] = useState('');
  const [impacts, setImpacts] = useState([]);
  const [learning, setLearning] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(() => new Set());

  const INIT_SELECT = 'id, name, description, status, proposed_go_live_date, program_id, change_owner_id, product_owner_id, business_owner_id, project_manager_id';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [initRes, progRes, peopleRes] = await Promise.all([
        supabase.from('initiatives').select(INIT_SELECT).eq('workspace_id', workspaceId).order('name'),
        supabase.from('programs').select('id, name').eq('workspace_id', workspaceId).order('name'),
        supabase.from('people').select('id, name').eq('workspace_id', workspaceId),
      ]);
      if (cancelled) return;
      const initRows = initRes.data || [];
      const progRows = progRes.data || [];
      setInitiatives(initRows);
      setPrograms(progRows);
      setPeople(peopleRes.data || []);
      if (initRows[0] && !initiativeId) setInitiativeId(initRows[0].id);
      if (progRows[0] && !programId) setProgramId(progRows[0].id);
    })();
    return () => { cancelled = true; };
  }, [workspaceId]);

  const programInitiatives = useMemo(
    () => (programId ? initiatives.filter((i) => i.program_id === programId) : []),
    [initiatives, programId],
  );

  const activeInitiativeIds = useMemo(() => {
    if (scope === 'program') return programInitiatives.map((i) => i.id);
    return initiativeId ? [initiativeId] : [];
  }, [scope, programInitiatives, initiativeId]);

  const activeInitiativeKey = activeInitiativeIds.join(',');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeInitiativeKey) {
        setImpacts([]);
        setLearning([]);
        setDepartments([]);
        return;
      }
      setLoading(true);
      const ids = activeInitiativeKey.split(',');
      const [imp, ln, dept] = await Promise.all([
        supabase.from('impacts').select('*').in('initiative_id', ids).order('created_at'),
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
  }, [activeInitiativeKey, workspaceId]);

  useEffect(() => {
    setCollapsed(new Set());
  }, [programId, scope]);

  const initiative = initiatives.find((i) => i.id === initiativeId);
  const program = programs.find((p) => p.id === programId);

  const toggleCollapsed = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
                  background: scope === opt.key ? C.coral : '#fff',
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
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: C.sub }}>Loading…</p>
      ) : scope === 'initiative' ? (
        !initiative ? (
          <p className="text-sm" style={{ color: C.sub }}>No initiatives in this workspace.</p>
        ) : (
          <article
            ref={exportRef}
            className="bg-white rounded-3xl border shadow-sm p-10 max-w-3xl"
            style={{ borderColor: C.border }}
          >
            <CiaInitiativeBody
              initiative={initiative}
              impacts={impacts.filter((imp) => imp.initiative_id === initiative.id)}
              learning={learning}
              departments={departments}
              people={people}
            />
          </article>
        )
      ) : !program ? (
        <p className="text-sm" style={{ color: C.sub }}>No programs in this workspace.</p>
      ) : programInitiatives.length === 0 ? (
        <p className="text-sm" style={{ color: C.sub }}>No initiatives under this program.</p>
      ) : (
        <div ref={exportRef} className="max-w-3xl space-y-4">
          <div className="bg-white rounded-3xl border shadow-sm p-6" style={{ borderColor: C.border }}>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: C.sub }}>
              ChangeView · Change Impact Assessment
            </div>
            <h3 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>{program.name}</h3>
            <p className="text-sm" style={{ color: C.sub }}>
              Program-level assessment covering {programInitiatives.length} initiative{programInitiatives.length === 1 ? '' : 's'}.
              {' '}Prepared {new Date().toLocaleDateString()}.
            </p>
          </div>
          {programInitiatives.map((init) => {
            const initImpacts = impacts.filter((imp) => imp.initiative_id === init.id);
            const impactIds = new Set(initImpacts.map((i) => i.id));
            const initLearning = learning.filter((l) => impactIds.has(l.impact_id));
            const isCollapsed = collapsed.has(init.id);
            return (
              <article
                key={init.id}
                className="bg-white rounded-3xl border shadow-sm overflow-hidden"
                style={{ borderColor: C.border }}
              >
                <button
                  type="button"
                  onClick={() => toggleCollapsed(init.id)}
                  className="w-full flex items-center gap-2 px-6 py-4 text-left border-b"
                  style={{ borderColor: C.border, background: C.bg }}
                >
                  <span className="text-sm font-bold" style={{ color: C.sub }}>{isCollapsed ? '▸' : '▾'}</span>
                  <span className="text-base font-extrabold flex-1" style={{ ...HEAD, color: C.ink }}>{init.name}</span>
                  <span className="text-xs" style={{ color: C.sub }}>
                    {initImpacts.length} impact{initImpacts.length === 1 ? '' : 's'}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="p-8">
                    <CiaInitiativeBody
                      initiative={init}
                      impacts={initImpacts}
                      learning={initLearning}
                      departments={departments}
                      people={people}
                      headingLevel="h4"
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
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

function ScheduleReport({ workspaceId, workspaceName, exportRef }) {
  const [programs, setPrograms] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [comms, setComms] = useState([]);
  const [hypercareRows, setHypercareRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [p, i, t, c, h] = await Promise.all([
        supabase.from('programs').select('id, name, start_date, proposed_go_live_date').eq('workspace_id', workspaceId).order('name'),
        supabase.from('initiatives').select('id, name, start_date, proposed_go_live_date, program_id').eq('workspace_id', workspaceId).order('name'),
        supabase.from('tasks').select('id, name, start_date, finish_date, initiative_id').eq('workspace_id', workspaceId).order('name'),
        supabase.from('comms').select('id, initiative_id, delivery_date, key_message').eq('workspace_id', workspaceId).order('delivery_date'),
        supabase.from('hypercare').select('id, initiative_id, start_date, end_date, duration').eq('workspace_id', workspaceId),
      ]);
      if (cancelled) return;
      setPrograms(p.data || []);
      setInitiatives(i.data || []);
      setTasks(t.data || []);
      setComms(c.data || []);
      setHypercareRows(h.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [workspaceId]);

  const sections = useMemo(() => {
    const initsByProgram = new Map();
    const orphans = [];
    initiatives.forEach((init) => {
      if (!init.program_id) {
        orphans.push(init);
        return;
      }
      if (!initsByProgram.has(init.program_id)) initsByProgram.set(init.program_id, []);
      initsByProgram.get(init.program_id).push(init);
    });
    const tasksByInit = new Map();
    tasks.forEach((task) => {
      if (!task.initiative_id) return;
      if (!tasksByInit.has(task.initiative_id)) tasksByInit.set(task.initiative_id, []);
      tasksByInit.get(task.initiative_id).push(task);
    });
    const hcByInit = new Map();
    hypercareRows.forEach((h) => {
      if (h.initiative_id) hcByInit.set(h.initiative_id, h);
    });
    const commsByInit = new Map();
    comms.forEach((c) => {
      if (!c.initiative_id) return;
      if (!commsByInit.has(c.initiative_id)) commsByInit.set(c.initiative_id, []);
      commsByInit.get(c.initiative_id).push(c);
    });

    const buildInitBlock = (init) => ({
      init,
      tasks: tasksByInit.get(init.id) || [],
      hypercare: hcByInit.get(init.id) || null,
      comms: (commsByInit.get(init.id) || []).slice().sort((a, b) => String(a.delivery_date || '').localeCompare(String(b.delivery_date || ''))),
    });

    const blocks = programs.map((program) => ({
      program,
      initiatives: (initsByProgram.get(program.id) || []).map(buildInitBlock),
    }));
    if (orphans.length) {
      blocks.push({
        program: { id: 'orphan', name: 'Unassigned initiatives' },
        initiatives: orphans.map(buildInitBlock),
      });
    }
    return blocks;
  }, [programs, initiatives, tasks, hypercareRows, comms]);

  if (loading) return <p className="text-sm" style={{ color: C.sub }}>Loading…</p>;

  if (!programs.length && !initiatives.length) {
    return <p className="text-sm" style={{ color: C.sub }}>No programs or initiatives in this workspace yet.</p>;
  }

  return (
    <article
      ref={exportRef}
      className="bg-white rounded-3xl border shadow-sm p-10 max-w-3xl"
      style={{ borderColor: C.border }}
    >
      <header className="border-b pb-5 mb-8" style={{ borderColor: C.border }}>
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: C.sub }}>
          ChangeView · Schedule Report
        </div>
        <h3 className="text-2xl font-extrabold mb-2" style={{ ...HEAD, color: C.ink }}>
          {workspaceName || 'Workspace'} timeline
        </h3>
        <p className="text-xs" style={{ color: C.sub }}>Prepared {new Date().toLocaleDateString()}</p>
      </header>

      <div className="space-y-8">
        {sections.map(({ program, initiatives: initBlocks }) => (
          <section key={program.id}>
            <h4 className="text-lg font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>
              Program · {program.name}
            </h4>
            <p className="text-sm mb-4" style={{ color: C.sub }}>
              {dateRangeLabel(program.start_date, program.proposed_go_live_date)}
              {program.proposed_go_live_date ? ` · Go live ${formatReportDate(program.proposed_go_live_date)}` : ''}
            </p>

            {initBlocks.length === 0 ? (
              <p className="text-sm pl-3" style={{ color: C.sub }}>No initiatives under this program.</p>
            ) : (
              <div className="space-y-5 pl-3 border-l-2" style={{ borderColor: C.border }}>
                {initBlocks.map(({ init, tasks: initTasks, hypercare, comms: initComms }) => (
                  <div key={init.id}>
                    <h5 className="text-sm font-extrabold mb-1" style={{ color: C.ink }}>
                      Initiative · {init.name}
                    </h5>
                    <p className="text-xs mb-2" style={{ color: C.sub }}>
                      Timeline: {dateRangeLabel(init.start_date, init.proposed_go_live_date)}
                    </p>
                    {init.proposed_go_live_date && (
                      <p className="text-xs font-semibold mb-2" style={{ color: C.navy }}>
                        Go Live milestone: {formatReportDate(init.proposed_go_live_date)}
                      </p>
                    )}

                    <div className="overflow-x-auto mb-3">
                      <table className="w-full text-xs" style={{ color: C.ink }}>
                        <thead>
                          <tr className="text-left" style={{ color: C.sub }}>
                            <th className="py-1.5 pr-3 font-semibold">Item</th>
                            <th className="py-1.5 pr-3 font-semibold">Type</th>
                            <th className="py-1.5 font-semibold">Dates</th>
                          </tr>
                        </thead>
                        <tbody>
                          {initTasks.map((task) => (
                            <tr key={task.id} className="border-t" style={{ borderColor: C.border }}>
                              <td className="py-1.5 pr-3">{task.name}</td>
                              <td className="py-1.5 pr-3">Task</td>
                              <td className="py-1.5">{dateRangeLabel(task.start_date, task.finish_date)}</td>
                            </tr>
                          ))}
                          {hypercare && (
                            <tr className="border-t" style={{ borderColor: C.border }}>
                              <td className="py-1.5 pr-3">Hypercare</td>
                              <td className="py-1.5 pr-3">Hypercare</td>
                              <td className="py-1.5">
                                {dateRangeLabel(hypercare.start_date, hypercare.end_date)}
                                {hypercare.duration ? ` (${hypercare.duration})` : ''}
                              </td>
                            </tr>
                          )}
                          {initComms.map((c) => (
                            <tr key={c.id} className="border-t" style={{ borderColor: C.border }}>
                              <td className="py-1.5 pr-3">{c.key_message || 'Untitled comms'}</td>
                              <td className="py-1.5 pr-3">Comms</td>
                              <td className="py-1.5">
                                {c.delivery_date ? `Delivery ${formatReportDate(c.delivery_date)}` : 'No delivery date'}
                              </td>
                            </tr>
                          ))}
                          {!initTasks.length && !hypercare && !initComms.length && (
                            <tr className="border-t" style={{ borderColor: C.border }}>
                              <td className="py-1.5" colSpan={3} style={{ color: C.sub }}>
                                No tasks, hypercare, or comms yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </article>
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          {active === 'schedule' && (
            <ScheduleReport
              workspaceId={activeWorkspaceId}
              workspaceName={activeWorkspace?.name}
              exportRef={exportRef}
            />
          )}
        </>
      )}
    </div>
  );
}
