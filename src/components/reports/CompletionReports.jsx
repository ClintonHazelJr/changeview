import { useEffect, useMemo, useState } from 'react';
import { C, HEAD, SEVERITY_COLOR, STATUS_COLOR, tint } from '../../lib/constants';
import { supabase } from '../../lib/supabase';

const REQ_STATUSES = [
  { key: 'draft', label: 'Draft' },
  { key: 'approved', label: 'Approved' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
];

const TASK_STATUSES = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'ready', label: 'Ready' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'done', label: 'Done' },
];

function pct(completed, total) {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
}

function CompletionHeadline({ completed, total, unitLabel, caption }) {
  const percent = pct(completed, total);
  return (
    <div className="rounded-3xl p-6 mb-5 border" style={{ borderColor: C.border, background: tint(C.navy, '08') }}>
      <div className="text-4xl font-extrabold tabular-nums" style={{ ...HEAD, color: C.ink }}>{percent}%</div>
      <div className="text-sm font-semibold mt-1" style={{ color: C.ink }}>
        {completed} of {total} {unitLabel} completed
      </div>
      {caption ? (
        <p className="text-xs mt-1.5" style={{ color: C.sub }}>{caption}</p>
      ) : null}
      <div className="h-2.5 rounded-full mt-4 overflow-hidden" style={{ background: C.border }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percent}%`, background: STATUS_COLOR.completed || '#16A34A' }}
        />
      </div>
    </div>
  );
}

function StatusDistribution({ counts, order, accentKey = null }) {
  const total = order.reduce((sum, s) => sum + (counts[s.key] || 0), 0);
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
      {order.map((s) => {
        const n = counts[s.key] || 0;
        const color = STATUS_COLOR[s.key] || C.sub;
        const emphasize = accentKey && s.key === accentKey && n > 0;
        return (
          <div
            key={s.key}
            className="rounded-2xl border p-3"
            style={{
              borderColor: emphasize ? color : C.border,
              background: emphasize ? tint(color, '12') : '#fff',
            }}
          >
            <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: C.sub }}>
              {s.label}
            </div>
            <div className="text-2xl font-extrabold tabular-nums" style={{ ...HEAD, color }}>
              {n}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: C.sub }}>
              {total ? `${Math.round((n / total) * 100)}%` : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NoTasksFlag({ hasTasks }) {
  if (hasTasks) {
    return <span className="text-xs" style={{ color: C.sub }}>Has tasks</span>;
  }
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: tint(C.amber, '22'), color: C.amber }}
      title="No linked tasks — completion must be set manually"
    >
      No linked tasks
    </span>
  );
}

function StatusPill({ status }) {
  const key = status || 'draft';
  const color = STATUS_COLOR[key] || C.sub;
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
      style={{ background: tint(color, '22'), color }}
    >
      {String(key).replace('_', ' ')}
    </span>
  );
}

function ScopeControls({
  scope, setScope, initiatives, initiativeId, setInitiativeId,
  programs, programId, setProgramId, accent = C.navy,
}) {
  return (
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
                background: scope === opt.key ? accent : '#fff',
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
  );
}

function useInitiativeOrProgramScope(workspaceId) {
  const [scope, setScope] = useState('initiative');
  const [programs, setPrograms] = useState([]);
  const [programId, setProgramId] = useState('');
  const [initiatives, setInitiatives] = useState([]);
  const [initiativeId, setInitiativeId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [initRes, progRes] = await Promise.all([
        supabase.from('initiatives').select('id, name, program_id').eq('workspace_id', workspaceId).order('name'),
        supabase.from('programs').select('id, name').eq('workspace_id', workspaceId).order('name'),
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

  const programInitiatives = useMemo(
    () => (programId ? initiatives.filter((i) => i.program_id === programId) : []),
    [initiatives, programId],
  );

  const activeInitiativeIds = useMemo(() => {
    if (scope === 'program') return programInitiatives.map((i) => i.id);
    return initiativeId ? [initiativeId] : [];
  }, [scope, programInitiatives, initiativeId]);

  const scopeLabel = scope === 'program'
    ? (programs.find((p) => p.id === programId)?.name || 'Program')
    : (initiatives.find((i) => i.id === initiativeId)?.name || 'Initiative');

  return {
    scope, setScope,
    programs, programId, setProgramId,
    initiatives, initiativeId, setInitiativeId,
    activeInitiativeIds,
    scopeLabel,
  };
}

/** Change Readiness — Learning Needs completion for one Initiative. */
export function ChangeReadinessReport({ workspaceId, exportRef }) {
  const [initiatives, setInitiatives] = useState([]);
  const [initiativeId, setInitiativeId] = useState('');
  const [learning, setLearning] = useState([]);
  const [impacts, setImpacts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [linkCounts, setLinkCounts] = useState(() => new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('initiatives')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .order('name');
      if (cancelled) return;
      const rows = data || [];
      setInitiatives(rows);
      if (rows[0]) setInitiativeId((prev) => prev || rows[0].id);
    })();
    return () => { cancelled = true; };
  }, [workspaceId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!initiativeId) {
        setLearning([]);
        setImpacts([]);
        setDepartments([]);
        setLinkCounts(new Map());
        return;
      }
      setLoading(true);
      const [imp, ln, dept, links] = await Promise.all([
        supabase.from('impacts').select('id, department_id').eq('initiative_id', initiativeId),
        supabase.from('learning_needs').select('*').eq('workspace_id', workspaceId).order('created_at'),
        supabase.from('departments').select('id, name').eq('workspace_id', workspaceId),
        supabase.from('task_learning_needs').select('learning_need_id').eq('workspace_id', workspaceId),
      ]);
      if (cancelled) return;
      const impactRows = imp.data || [];
      const impactIds = new Set(impactRows.map((i) => i.id));
      const lnRows = (ln.data || []).filter((l) => impactIds.has(l.impact_id));
      setImpacts(impactRows);
      setLearning(lnRows);
      setDepartments(dept.data || []);
      const counts = new Map();
      (links.data || []).forEach((row) => {
        counts.set(row.learning_need_id, (counts.get(row.learning_need_id) || 0) + 1);
      });
      setLinkCounts(counts);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [initiativeId, workspaceId]);

  const deptName = (id) => departments.find((d) => d.id === id)?.name || '—';
  const impactDept = (impactId) => {
    const imp = impacts.find((i) => i.id === impactId);
    return imp ? deptName(imp.department_id) : '—';
  };

  const completed = learning.filter((l) => l.status === 'completed').length;
  const total = learning.length;

  const byDept = useMemo(() => {
    const map = new Map();
    learning.forEach((ln) => {
      const imp = impacts.find((i) => i.id === ln.impact_id);
      const name = imp
        ? (departments.find((d) => d.id === imp.department_id)?.name || '—')
        : '—';
      if (!map.has(name)) map.set(name, { name, total: 0, completed: 0 });
      const row = map.get(name);
      row.total += 1;
      if (ln.status === 'completed') row.completed += 1;
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [learning, impacts, departments]);

  const initiative = initiatives.find((i) => i.id === initiativeId);

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
      ) : (
        <div ref={exportRef} className="bg-white rounded-2xl border overflow-x-auto p-4" style={{ borderColor: C.border }}>
          <div className="mb-4 px-1">
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.sub }}>ChangeView</div>
            <h3 className="text-lg font-extrabold" style={{ ...HEAD, color: C.ink }}>Change Readiness</h3>
            <p className="text-sm" style={{ color: C.sub }}>{initiative?.name || '—'}</p>
          </div>

          <CompletionHeadline
            completed={completed}
            total={total}
            unitLabel="Learning Needs"
            caption="Based on training task completion"
          />

          <div className="mb-5">
            <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>
              By department
            </div>
            {byDept.length === 0 ? (
              <p className="text-sm" style={{ color: C.sub }}>No learning needs for this initiative.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {byDept.map((d) => {
                  const p = pct(d.completed, d.total);
                  return (
                    <div key={d.name} className="rounded-2xl border p-4" style={{ borderColor: C.border }}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="text-sm font-bold" style={{ color: C.ink }}>{d.name}</div>
                        <div className="text-sm font-extrabold tabular-nums" style={{ color: C.ink }}>{p}%</div>
                      </div>
                      <div className="text-xs mb-2" style={{ color: C.sub }}>
                        {d.completed} of {d.total} complete
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: C.border }}>
                        <div className="h-full rounded-full" style={{ width: `${p}%`, background: STATUS_COLOR.completed }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <table className="w-full text-sm text-left min-w-[720px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide border-b" style={{ color: C.sub, borderColor: C.border, background: C.bg }}>
                {['Learning Need', 'Team', 'Department', 'Status', 'Tasks'].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {learning.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center" style={{ color: C.sub }}>No learning needs.</td></tr>
              ) : learning.map((ln) => (
                <tr key={ln.id} className="border-b align-top" style={{ borderColor: C.border }}>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: C.ink }}>{ln.goal || '—'}</td>
                  <td className="px-3 py-2.5" style={{ color: C.ink }}>{ln.team || '—'}</td>
                  <td className="px-3 py-2.5" style={{ color: C.sub }}>{impactDept(ln.impact_id)}</td>
                  <td className="px-3 py-2.5"><StatusPill status={ln.status} /></td>
                  <td className="px-3 py-2.5"><NoTasksFlag hasTasks={(linkCounts.get(ln.id) || 0) > 0} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Requirements Completion — Initiative or Program scope. */
export function RequirementsCompletionReport({ workspaceId, exportRef }) {
  const scopeState = useInitiativeOrProgramScope(workspaceId);
  const {
    scope, setScope, programs, programId, setProgramId,
    initiatives, initiativeId, setInitiativeId, activeInitiativeIds, scopeLabel,
  } = scopeState;
  const [rows, setRows] = useState([]);
  const [linkCounts, setLinkCounts] = useState(() => new Map());
  const [loading, setLoading] = useState(false);
  const activeKey = activeInitiativeIds.join(',');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeKey) {
        setRows([]);
        setLinkCounts(new Map());
        return;
      }
      setLoading(true);
      const ids = activeKey.split(',');
      const [req, links] = await Promise.all([
        supabase.from('requirements').select('*').in('initiative_id', ids).order('created_at'),
        supabase.from('task_requirements').select('requirement_id').eq('workspace_id', workspaceId),
      ]);
      if (cancelled) return;
      setRows(req.data || []);
      const counts = new Map();
      (links.data || []).forEach((row) => {
        counts.set(row.requirement_id, (counts.get(row.requirement_id) || 0) + 1);
      });
      setLinkCounts(counts);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeKey, workspaceId]);

  const completed = rows.filter((r) => r.status === 'completed').length;
  const statusCounts = REQ_STATUSES.reduce((acc, s) => {
    acc[s.key] = rows.filter((r) => (r.status || 'draft') === s.key).length;
    return acc;
  }, {});
  const initName = (id) => initiatives.find((i) => i.id === id)?.name || '—';

  return (
    <div>
      <ScopeControls
        scope={scope}
        setScope={setScope}
        initiatives={initiatives}
        initiativeId={initiativeId}
        setInitiativeId={setInitiativeId}
        programs={programs}
        programId={programId}
        setProgramId={setProgramId}
        accent={C.amber}
      />
      {loading ? (
        <p className="text-sm" style={{ color: C.sub }}>Loading…</p>
      ) : (
        <div ref={exportRef} className="bg-white rounded-2xl border overflow-x-auto p-4" style={{ borderColor: C.border }}>
          <div className="mb-4 px-1">
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.sub }}>ChangeView</div>
            <h3 className="text-lg font-extrabold" style={{ ...HEAD, color: C.ink }}>Requirements Completion</h3>
            <p className="text-sm" style={{ color: C.sub }}>{scopeLabel}</p>
          </div>
          <CompletionHeadline completed={completed} total={rows.length} unitLabel="Requirements" />
          <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>By status</div>
          <StatusDistribution counts={statusCounts} order={REQ_STATUSES} />
          <table className="w-full text-sm text-left min-w-[720px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide border-b" style={{ color: C.sub, borderColor: C.border, background: C.bg }}>
                {(scope === 'program'
                  ? ['Initiative', 'Requirement', 'Priority', 'Status', 'Tasks']
                  : ['Requirement', 'Priority', 'Status', 'Tasks']
                ).map((h) => (
                  <th key={h} className="px-3 py-2.5 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={scope === 'program' ? 5 : 4} className="px-3 py-6 text-center" style={{ color: C.sub }}>
                    No requirements.
                  </td>
                </tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-b align-top" style={{ borderColor: C.border }}>
                  {scope === 'program' && (
                    <td className="px-3 py-2.5" style={{ color: C.sub }}>{initName(r.initiative_id)}</td>
                  )}
                  <td className="px-3 py-2.5 font-semibold" style={{ color: C.ink }}>
                    {r.reference_number ? `${r.reference_number} · ` : ''}{r.description || '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.priority ? (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: tint(SEVERITY_COLOR[r.priority] || C.sub, '22'), color: SEVERITY_COLOR[r.priority] || C.sub }}
                      >
                        {r.priority}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2.5"><StatusPill status={r.status} /></td>
                  <td className="px-3 py-2.5"><NoTasksFlag hasTasks={(linkCounts.get(r.id) || 0) > 0} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Task Completion — Initiative or Program scope. */
export function TaskCompletionReport({ workspaceId, exportRef }) {
  const scopeState = useInitiativeOrProgramScope(workspaceId);
  const {
    scope, setScope, programs, programId, setProgramId,
    initiatives, initiativeId, setInitiativeId, activeInitiativeIds, scopeLabel,
  } = scopeState;
  const [rows, setRows] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const activeKey = activeInitiativeIds.join(',');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeKey) {
        setRows([]);
        return;
      }
      setLoading(true);
      const ids = activeKey.split(',');
      const [taskRes, peopleRes] = await Promise.all([
        supabase.from('tasks').select('*').in('initiative_id', ids).order('created_at'),
        supabase.from('people').select('id, name').eq('workspace_id', workspaceId),
      ]);
      if (cancelled) return;
      setRows(taskRes.data || []);
      setPeople(peopleRes.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeKey, workspaceId]);

  const done = rows.filter((t) => t.status === 'done').length;
  const statusCounts = TASK_STATUSES.reduce((acc, s) => {
    acc[s.key] = rows.filter((t) => (t.status || 'backlog') === s.key).length;
    return acc;
  }, {});
  const personName = (id) => people.find((p) => p.id === id)?.name || 'Unassigned';
  const initName = (id) => initiatives.find((i) => i.id === id)?.name || '—';

  const byAssignee = useMemo(() => {
    const map = new Map();
    rows.forEach((t) => {
      const key = t.assignee_id || 'none';
      if (!map.has(key)) map.set(key, { id: key, name: personName(t.assignee_id), total: 0, done: 0 });
      const row = map.get(key);
      row.total += 1;
      if (t.status === 'done') row.done += 1;
    });
    return [...map.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [rows, people]);

  return (
    <div>
      <ScopeControls
        scope={scope}
        setScope={setScope}
        initiatives={initiatives}
        initiativeId={initiativeId}
        setInitiativeId={setInitiativeId}
        programs={programs}
        programId={programId}
        setProgramId={setProgramId}
        accent={C.teal}
      />
      {loading ? (
        <p className="text-sm" style={{ color: C.sub }}>Loading…</p>
      ) : (
        <div ref={exportRef} className="bg-white rounded-2xl border overflow-x-auto p-4" style={{ borderColor: C.border }}>
          <div className="mb-4 px-1">
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.sub }}>ChangeView</div>
            <h3 className="text-lg font-extrabold" style={{ ...HEAD, color: C.ink }}>Task Completion</h3>
            <p className="text-sm" style={{ color: C.sub }}>{scopeLabel}</p>
          </div>
          <CompletionHeadline completed={done} total={rows.length} unitLabel="Tasks" />
          <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>By status</div>
          <StatusDistribution counts={statusCounts} order={TASK_STATUSES} accentKey="blocked" />

          <div className="mb-5">
            <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>
              By assignee
            </div>
            {byAssignee.length === 0 ? (
              <p className="text-sm" style={{ color: C.sub }}>No tasks.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {byAssignee.map((a) => {
                  const p = pct(a.done, a.total);
                  return (
                    <div key={a.id} className="rounded-2xl border p-4" style={{ borderColor: C.border }}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="text-sm font-bold" style={{ color: C.ink }}>{a.name}</div>
                        <div className="text-sm font-extrabold tabular-nums" style={{ color: C.ink }}>{p}%</div>
                      </div>
                      <div className="text-xs" style={{ color: C.sub }}>{a.done} of {a.total} done</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <table className="w-full text-sm text-left min-w-[720px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide border-b" style={{ color: C.sub, borderColor: C.border, background: C.bg }}>
                {(scope === 'program'
                  ? ['Initiative', 'Task', 'Assignee', 'Status', 'Priority']
                  : ['Task', 'Assignee', 'Status', 'Priority']
                ).map((h) => (
                  <th key={h} className="px-3 py-2.5 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={scope === 'program' ? 5 : 4} className="px-3 py-6 text-center" style={{ color: C.sub }}>
                    No tasks.
                  </td>
                </tr>
              ) : rows.map((t) => (
                <tr key={t.id} className="border-b align-top" style={{ borderColor: C.border }}>
                  {scope === 'program' && (
                    <td className="px-3 py-2.5" style={{ color: C.sub }}>{initName(t.initiative_id)}</td>
                  )}
                  <td className="px-3 py-2.5 font-semibold" style={{ color: C.ink }}>{t.name}</td>
                  <td className="px-3 py-2.5" style={{ color: C.ink }}>{personName(t.assignee_id)}</td>
                  <td className="px-3 py-2.5"><StatusPill status={t.status || 'backlog'} /></td>
                  <td className="px-3 py-2.5">
                    {t.priority ? (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: tint(SEVERITY_COLOR[t.priority] || C.sub, '22'), color: SEVERITY_COLOR[t.priority] || C.sub }}
                      >
                        {t.priority}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
