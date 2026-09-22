import { useEffect, useMemo, useState } from 'react';
import { C, HEAD, SEVERITY_COLOR, STATUS_COLOR, tint, isRatedSeverity } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import {
  CompletionHeadline,
  ScopeControls,
} from './CompletionReports';

const SEV_COLS = [
  { key: 'severity_people', label: 'People' },
  { key: 'severity_process', label: 'Process' },
  { key: 'severity_system', label: 'System' },
];

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatReportDate(value) {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function SectionTitle({ children }) {
  return (
    <h4
      className="text-sm font-extrabold uppercase tracking-wide mb-3"
      style={{ ...HEAD, color: C.ink }}
    >
      {children}
    </h4>
  );
}

function SummaryStat({ label, value, emphasize = false, color = C.ink }) {
  return (
    <div
      className="rounded-2xl border p-3"
      style={{
        borderColor: emphasize ? color : C.border,
        background: emphasize ? tint(color, '12') : '#fff',
      }}
    >
      <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: C.sub }}>
        {label}
      </div>
      <div className="text-2xl font-extrabold tabular-nums" style={{ ...HEAD, color }}>
        {value}
      </div>
    </div>
  );
}

function CloseOutInitiativeBody({
  initiative,
  organizationName,
  engagementStart,
  completionDate,
  closingNotes,
  impacts,
  requirements,
  tasks,
  learning,
  stakeholders,
  people,
  departments,
  headingLevel = 'h3',
  showHeaderMeta = true,
}) {
  const TitleTag = headingLevel;
  const deptName = (id) => departments.find((d) => d.id === id)?.name || '—';
  const personById = (id) => people.find((p) => p.id === id);

  const reqCompleted = requirements.filter((r) => r.status === 'completed').length;
  const reqOpen = requirements.length - reqCompleted;
  const tasksDone = tasks.filter((t) => t.status === 'done').length;
  const tasksOpen = tasks.length - tasksDone;
  const tasksBlocked = tasks.filter((t) => t.status === 'blocked').length;
  const lnCompleted = learning.filter((l) => l.status === 'completed').length;
  const hasReadiness = learning.length > 0;
  const readinessPct = hasReadiness
    ? Math.round((lnCompleted / learning.length) * 100)
    : null;

  return (
    <>
      <header className="border-b pb-5 mb-8" style={{ borderColor: C.border }}>
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: C.sub }}>
          ChangeView · Project Close Out Report
        </div>
        <TitleTag className="text-2xl font-extrabold mb-2" style={{ ...HEAD, color: C.ink }}>
          {initiative.name}
        </TitleTag>
        {showHeaderMeta && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: C.sub }}>
            <span>Organization: <span style={{ color: C.ink }}>{organizationName || '—'}</span></span>
            <span>Engagement start: <span style={{ color: C.ink }}>{formatReportDate(engagementStart)}</span></span>
            <span>Completion: <span style={{ color: C.ink }}>{formatReportDate(completionDate)}</span></span>
          </div>
        )}
      </header>

      <section className="mb-8">
        <SectionTitle>Scope delivered</SectionTitle>
        {impacts.length === 0 ? (
          <p className="text-sm" style={{ color: C.sub }}>No impacts recorded for this initiative.</p>
        ) : (
          <div className="space-y-4">
            {impacts.map((imp, idx) => (
              <div
                key={imp.id}
                className="rounded-2xl border p-4"
                style={{ borderColor: C.border }}
              >
                <div className="flex flex-wrap items-baseline gap-2 mb-2">
                  <div className="text-sm font-extrabold" style={{ ...HEAD, color: C.ink }}>
                    {idx + 1}. {deptName(imp.department_id)}
                  </div>
                  {imp.headcount_impacted != null && (
                    <span className="text-xs" style={{ color: C.sub }}>
                      · {imp.headcount_impacted} impacted
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {SEV_COLS.map((col) => {
                    const val = imp[col.key] || 'none';
                    if (!isRatedSeverity(val)) return null;
                    const color = SEVERITY_COLOR[val] || C.sub;
                    return (
                      <span
                        key={col.key}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: tint(color, '22'), color }}
                      >
                        {col.label}: {val}
                      </span>
                    );
                  })}
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="rounded-xl p-3" style={{ background: C.bg }}>
                    <div className="text-[11px] font-bold uppercase mb-1" style={{ color: C.sub }}>Current state</div>
                    <p className="text-sm mb-1" style={{ color: C.ink }}>
                      <span style={{ color: C.sub }}>System:</span> {imp.current_state_system || '—'}
                    </p>
                    <p className="text-sm" style={{ color: C.ink }}>
                      <span style={{ color: C.sub }}>Process:</span> {imp.current_state_process || '—'}
                    </p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: C.bg }}>
                    <div className="text-[11px] font-bold uppercase mb-1" style={{ color: C.sub }}>Future state</div>
                    <p className="text-sm mb-1" style={{ color: C.ink }}>
                      <span style={{ color: C.sub }}>System:</span> {imp.future_state_system || '—'}
                    </p>
                    <p className="text-sm" style={{ color: C.ink }}>
                      <span style={{ color: C.sub }}>Process:</span> {imp.future_state_process || '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <SectionTitle>Requirements summary</SectionTitle>
        <CompletionHeadline
          completed={reqCompleted}
          total={requirements.length}
          unitLabel="Requirements"
        />
        <div className="grid sm:grid-cols-3 gap-3">
          <SummaryStat label="Total" value={requirements.length} />
          <SummaryStat label="Completed" value={reqCompleted} color={STATUS_COLOR.completed || '#16A34A'} />
          <SummaryStat
            label="Open at close"
            value={reqOpen}
            emphasize={reqOpen > 0}
            color={reqOpen > 0 ? C.amber : C.ink}
          />
        </div>
      </section>

      <section className="mb-8">
        <SectionTitle>Tasks summary</SectionTitle>
        <CompletionHeadline
          completed={tasksDone}
          total={tasks.length}
          unitLabel="Tasks"
        />
        <div className="grid sm:grid-cols-4 gap-3">
          <SummaryStat label="Total" value={tasks.length} />
          <SummaryStat label="Done" value={tasksDone} color={STATUS_COLOR.done || STATUS_COLOR.completed || '#16A34A'} />
          <SummaryStat
            label="Open at close"
            value={tasksOpen}
            emphasize={tasksOpen > 0}
            color={tasksOpen > 0 ? C.amber : C.ink}
          />
          <SummaryStat
            label="Blocked"
            value={tasksBlocked}
            emphasize={tasksBlocked > 0}
            color={STATUS_COLOR.blocked || C.coral}
          />
        </div>
      </section>

      <section className="mb-8">
        <SectionTitle>Learning needs delivered</SectionTitle>
        <CompletionHeadline
          completed={lnCompleted}
          total={learning.length}
          unitLabel="Learning Needs"
          caption="Based on training task completion"
        />
        <div className="grid sm:grid-cols-3 gap-3">
          <SummaryStat label="Total" value={learning.length} />
          <SummaryStat label="Completed" value={lnCompleted} color={STATUS_COLOR.completed || '#16A34A'} />
          <SummaryStat
            label="Open at close"
            value={learning.length - lnCompleted}
            emphasize={learning.length - lnCompleted > 0}
            color={learning.length - lnCompleted > 0 ? C.amber : C.ink}
          />
        </div>
      </section>

      <section className="mb-8">
        <SectionTitle>Stakeholder engagement</SectionTitle>
        {stakeholders.length === 0 ? (
          <p className="text-sm" style={{ color: C.sub }}>No stakeholders recorded for this initiative.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr
                className="text-[11px] uppercase tracking-wide border-b"
                style={{ color: C.sub, borderColor: C.border, background: C.bg }}
              >
                {['Name', 'Role', 'Department'].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stakeholders.map((s) => {
                const person = personById(s.person_id);
                return (
                  <tr key={s.id} className="border-b" style={{ borderColor: C.border }}>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: C.ink }}>
                      {person?.name || '—'}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: C.ink }}>
                      {s.project_role || person?.title || '—'}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: C.sub }}>
                      {person?.department_id ? deptName(person.department_id) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {hasReadiness && (
        <section className="mb-8">
          <SectionTitle>Final readiness snapshot</SectionTitle>
          <div
            className="rounded-3xl p-6 border"
            style={{ borderColor: C.border, background: tint('#16A34A', '08') }}
          >
            <div className="text-4xl font-extrabold tabular-nums" style={{ ...HEAD, color: C.ink }}>
              {readinessPct}%
            </div>
            <div className="text-sm font-semibold mt-1" style={{ color: C.ink }}>
              Change readiness at close
            </div>
            <p className="text-xs mt-1.5" style={{ color: C.sub }}>
              {lnCompleted} of {learning.length} Learning Needs completed
            </p>
            <div className="h-2.5 rounded-full mt-4 overflow-hidden" style={{ background: C.border }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${readinessPct}%`, background: STATUS_COLOR.completed || '#16A34A' }}
              />
            </div>
          </div>
        </section>
      )}

      {closingNotes?.trim() ? (
        <section className="mb-2">
          <SectionTitle>Closing notes</SectionTitle>
          <div className="rounded-2xl border p-4" style={{ borderColor: C.border, background: C.bg }}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: C.ink }}>
              {closingNotes.trim()}
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}

/** Project Close Out — Initiative or Program scope (CIA-style program loop). */
export default function CloseOutReport({ workspaceId, exportRef }) {
  const [scope, setScope] = useState('initiative');
  const [programs, setPrograms] = useState([]);
  const [programId, setProgramId] = useState('');
  const [initiatives, setInitiatives] = useState([]);
  const [initiativeId, setInitiativeId] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [impacts, setImpacts] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [learning, setLearning] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [people, setPeople] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [closeDate, setCloseDate] = useState(todayIso);
  const [closingNotes, setClosingNotes] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [initRes, progRes, orgRes] = await Promise.all([
        supabase
          .from('initiatives')
          .select('id, name, start_date, program_id, status')
          .eq('workspace_id', workspaceId)
          .order('name'),
        supabase
          .from('programs')
          .select('id, name, start_date, organization_id')
          .eq('workspace_id', workspaceId)
          .order('name'),
        supabase
          .from('organizations')
          .select('id, name')
          .eq('workspace_id', workspaceId)
          .order('name'),
      ]);
      if (cancelled) return;
      const initRows = initRes.data || [];
      const progRows = progRes.data || [];
      setInitiatives(initRows);
      setPrograms(progRows);
      setOrganizations(orgRes.data || []);
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

  const activeKey = activeInitiativeIds.join(',');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeKey) {
        setImpacts([]);
        setRequirements([]);
        setTasks([]);
        setLearning([]);
        setStakeholders([]);
        setPeople([]);
        setDepartments([]);
        return;
      }
      setLoading(true);
      const ids = activeKey.split(',');
      const [imp, req, task, ln, stake, peep, dept] = await Promise.all([
        supabase.from('impacts').select('*').in('initiative_id', ids).order('created_at'),
        supabase.from('requirements').select('id, initiative_id, status').in('initiative_id', ids),
        supabase.from('tasks').select('id, initiative_id, status').in('initiative_id', ids),
        supabase.from('learning_needs').select('*').eq('workspace_id', workspaceId).order('created_at'),
        supabase.from('stakeholders').select('*').in('initiative_id', ids).order('created_at'),
        supabase
          .from('people')
          .select('id, name, title, department_id')
          .eq('workspace_id', workspaceId),
        supabase.from('departments').select('id, name').eq('workspace_id', workspaceId),
      ]);
      if (cancelled) return;
      const impactRows = imp.data || [];
      const impactIds = new Set(impactRows.map((i) => i.id));
      setImpacts(impactRows);
      setRequirements(req.data || []);
      setTasks(task.data || []);
      setLearning((ln.data || []).filter((l) => impactIds.has(l.impact_id)));
      setStakeholders(stake.data || []);
      setPeople(peep.data || []);
      setDepartments(dept.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeKey, workspaceId]);

  useEffect(() => {
    setCollapsed(new Set());
  }, [programId, scope]);

  const initiative = initiatives.find((i) => i.id === initiativeId);
  const program = programs.find((p) => p.id === programId);

  const orgNameForProgram = (prog) => {
    if (!prog?.organization_id) return '—';
    return organizations.find((o) => o.id === prog.organization_id)?.name || '—';
  };

  const orgForInitiative = (init) => {
    const prog = programs.find((p) => p.id === init?.program_id);
    return orgNameForProgram(prog);
  };

  const startForInitiative = (init) => {
    if (init?.start_date) return init.start_date;
    const prog = programs.find((p) => p.id === init?.program_id);
    return prog?.start_date || null;
  };

  const toggleCollapsed = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const dataForInitiative = (init) => {
    const initImpacts = impacts.filter((imp) => imp.initiative_id === init.id);
    const impactIds = new Set(initImpacts.map((i) => i.id));
    return {
      impacts: initImpacts,
      requirements: requirements.filter((r) => r.initiative_id === init.id),
      tasks: tasks.filter((t) => t.initiative_id === init.id),
      learning: learning.filter((l) => impactIds.has(l.impact_id)),
      stakeholders: stakeholders.filter((s) => s.initiative_id === init.id),
    };
  };

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
        accent={C.darknavy}
      />

      <div className="grid md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: C.sub }}>
            Completion date
          </label>
          <input
            type="date"
            className="text-sm rounded-xl border px-3 py-2 w-full max-w-[260px]"
            style={{ borderColor: C.border, color: C.ink }}
            value={closeDate}
            onChange={(e) => setCloseDate(e.target.value || todayIso())}
          />
          <p className="text-[11px] mt-1" style={{ color: C.sub }}>
            Defaults to today if you run this before a formal close.
          </p>
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: C.sub }}>
            Closing notes
          </label>
          <textarea
            className="text-sm rounded-xl border px-3 py-2 w-full min-h-[88px] resize-y"
            style={{ borderColor: C.border, color: C.ink }}
            placeholder="Lessons learned, follow-up items, anything not captured elsewhere…"
            value={closingNotes}
            onChange={(e) => setClosingNotes(e.target.value)}
          />
        </div>
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
            <CloseOutInitiativeBody
              initiative={initiative}
              organizationName={orgForInitiative(initiative)}
              engagementStart={startForInitiative(initiative)}
              completionDate={closeDate}
              closingNotes={closingNotes}
              {...dataForInitiative(initiative)}
              people={people}
              departments={departments}
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
              ChangeView · Project Close Out Report
            </div>
            <h3 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>{program.name}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-3" style={{ color: C.sub }}>
              <span>Organization: <span style={{ color: C.ink }}>{orgNameForProgram(program)}</span></span>
              <span>Engagement start: <span style={{ color: C.ink }}>{formatReportDate(program.start_date)}</span></span>
              <span>Completion: <span style={{ color: C.ink }}>{formatReportDate(closeDate)}</span></span>
            </div>
            <p className="text-sm" style={{ color: C.sub }}>
              Program close-out covering {programInitiatives.length} initiative
              {programInitiatives.length === 1 ? '' : 's'}.
            </p>
            {closingNotes.trim() ? (
              <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: C.border, background: C.bg }}>
                <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: C.sub }}>
                  Closing notes
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: C.ink }}>
                  {closingNotes.trim()}
                </p>
              </div>
            ) : null}
          </div>
          {programInitiatives.map((init) => {
            const data = dataForInitiative(init);
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
                    {data.impacts.length} impact{data.impacts.length === 1 ? '' : 's'}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="p-8">
                    <CloseOutInitiativeBody
                      initiative={init}
                      organizationName={orgNameForProgram(program)}
                      engagementStart={startForInitiative(init)}
                      completionDate={closeDate}
                      closingNotes=""
                      {...data}
                      people={people}
                      departments={departments}
                      headingLevel="h4"
                      showHeaderMeta
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
