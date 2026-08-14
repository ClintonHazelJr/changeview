import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, ChevronDown, ChevronRight } from 'lucide-react';
import { C, HEAD, BODY, tint } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';

function parseDate(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeek(d) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatShort(d) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatFullDate(value) {
  const d = parseDate(value);
  if (!d) return value || '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function excerpt(text, n = 72) {
  const t = String(text || '').trim();
  if (!t) return 'Untitled';
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

const DAY_MS = 86400000;
const ROW_H = 40;
const LABEL_W = 280;
const PX_PER_DAY = 14;

/** Distinct bar / milestone colors. */
const COLOR_PROGRAM = C.teal;
const COLOR_INITIATIVE = C.coral;
const COLOR_TASK = C.royal;
const COLOR_HYPERCARE = C.darknavy;
const COLOR_GO_LIVE = C.navy;
const COLOR_COMMS = C.blue4;

export default function SchedulePanel() {
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const [programs, setPrograms] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [comms, setComms] = useState([]);
  const [hypercareRows, setHypercareRows] = useState([]);
  const [loading, setLoading] = useState(true);
  /** Collapsed Program / Initiative ids. Empty = all expanded. */
  const [collapsed, setCollapsed] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeWorkspaceId) {
        setPrograms([]);
        setInitiatives([]);
        setTasks([]);
        setComms([]);
        setHypercareRows([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const [
        { data: prog },
        { data: inits },
        { data: taskRows },
        { data: commsRows },
        { data: hcRows },
      ] = await Promise.all([
        supabase
          .from('programs')
          .select('id, name, start_date, proposed_go_live_date')
          .eq('workspace_id', activeWorkspaceId)
          .order('name'),
        supabase
          .from('initiatives')
          .select('id, name, start_date, proposed_go_live_date, program_id')
          .eq('workspace_id', activeWorkspaceId)
          .order('name'),
        supabase
          .from('tasks')
          .select('id, name, start_date, finish_date, initiative_id')
          .eq('workspace_id', activeWorkspaceId)
          .order('name'),
        supabase
          .from('comms')
          .select('id, initiative_id, delivery_date, key_message')
          .eq('workspace_id', activeWorkspaceId)
          .order('delivery_date'),
        supabase
          .from('hypercare')
          .select('id, initiative_id, start_date, end_date')
          .eq('workspace_id', activeWorkspaceId),
      ]);
      if (cancelled) return;
      setPrograms(prog || []);
      setInitiatives(inits || []);
      setTasks(taskRows || []);
      setComms(commsRows || []);
      setHypercareRows(hcRows || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  const treeRows = useMemo(() => {
    const initsByProgram = new Map();
    const orphans = [];
    initiatives.forEach((i) => {
      if (!i.program_id) {
        orphans.push(i);
        return;
      }
      if (!initsByProgram.has(i.program_id)) initsByProgram.set(i.program_id, []);
      initsByProgram.get(i.program_id).push(i);
    });

    const tasksByInit = new Map();
    tasks.forEach((t) => {
      if (!t.initiative_id) return;
      if (!tasksByInit.has(t.initiative_id)) tasksByInit.set(t.initiative_id, []);
      tasksByInit.get(t.initiative_id).push(t);
    });

    const hypercareByInit = new Map();
    hypercareRows.forEach((h) => {
      if (h.initiative_id) hypercareByInit.set(h.initiative_id, h);
    });

    const commsByInit = new Map();
    comms.forEach((c) => {
      if (!c.initiative_id || !c.delivery_date) return;
      if (!commsByInit.has(c.initiative_id)) commsByInit.set(c.initiative_id, []);
      commsByInit.get(c.initiative_id).push(c);
    });

    const out = [];

    const pushInitiative = (init, depth) => {
      const childTasks = tasksByInit.get(init.id) || [];
      const hc = hypercareByInit.get(init.id);
      const hasChildren = childTasks.length > 0 || Boolean(hc);
      out.push({
        id: `initiative-${init.id}`,
        entityId: init.id,
        name: init.name,
        kind: 'Initiative',
        depth,
        collapsible: hasChildren,
        color: COLOR_INITIATIVE,
        start: init.start_date,
        end: init.proposed_go_live_date,
        goLive: init.proposed_go_live_date || null,
        comms: commsByInit.get(init.id) || [],
      });
      if (collapsed.has(init.id)) return;
      childTasks.forEach((t) => {
        out.push({
          id: `task-${t.id}`,
          entityId: t.id,
          name: t.name,
          kind: 'Task',
          depth: depth + 1,
          collapsible: false,
          color: COLOR_TASK,
          start: t.start_date,
          end: t.finish_date,
          goLive: null,
          comms: [],
        });
      });
      if (hc) {
        out.push({
          id: `hypercare-${hc.id}`,
          entityId: hc.id,
          name: 'Hypercare',
          kind: 'Hypercare',
          depth: depth + 1,
          collapsible: false,
          color: COLOR_HYPERCARE,
          start: hc.start_date,
          end: hc.end_date,
          goLive: null,
          comms: [],
        });
      }
    };

    programs.forEach((p) => {
      const childInits = initsByProgram.get(p.id) || [];
      out.push({
        id: `program-${p.id}`,
        entityId: p.id,
        name: p.name,
        kind: 'Program',
        depth: 0,
        collapsible: childInits.length > 0,
        color: COLOR_PROGRAM,
        start: p.start_date,
        end: p.proposed_go_live_date,
        goLive: null,
        comms: [],
      });
      if (collapsed.has(p.id)) return;
      childInits.forEach((init) => pushInitiative(init, 1));
    });

    orphans.forEach((init) => pushInitiative(init, 0));

    return out;
  }, [programs, initiatives, tasks, comms, hypercareRows, collapsed]);

  const range = useMemo(() => {
    const dates = [];
    const consider = (value) => {
      const d = parseDate(value);
      if (d) dates.push(d);
    };
    programs.forEach((p) => {
      consider(p.start_date);
      consider(p.proposed_go_live_date);
    });
    initiatives.forEach((i) => {
      consider(i.start_date);
      consider(i.proposed_go_live_date);
    });
    tasks.forEach((t) => {
      consider(t.start_date);
      consider(t.finish_date);
    });
    hypercareRows.forEach((h) => {
      consider(h.start_date);
      consider(h.end_date);
    });
    comms.forEach((c) => consider(c.delivery_date));

    if (!dates.length) {
      const today = new Date();
      return { min: startOfWeek(today), max: addDays(startOfWeek(today), 84) };
    }
    let min = new Date(Math.min(...dates));
    let max = new Date(Math.max(...dates));
    min = startOfWeek(addDays(min, -7));
    max = addDays(startOfWeek(max), 28);
    if (max <= min) max = addDays(min, 56);
    return { min, max };
  }, [programs, initiatives, tasks, hypercareRows, comms]);

  const totalDays = Math.max(1, Math.round((range.max - range.min) / DAY_MS));
  const timelineWidth = totalDays * PX_PER_DAY;

  const weekTicks = useMemo(() => {
    const ticks = [];
    for (let d = new Date(range.min); d < range.max; d = addDays(d, 7)) {
      ticks.push(new Date(d));
    }
    return ticks;
  }, [range]);

  /** Both ends required — no zero-width / single-date fallback bars. */
  const barStyle = (row) => {
    const s = parseDate(row.start);
    const e = parseDate(row.end);
    if (!s || !e) return null;
    const left = ((s - range.min) / DAY_MS) * PX_PER_DAY;
    const spanDays = Math.max(1, Math.round((e - s) / DAY_MS) + 1);
    const width = spanDays * PX_PER_DAY;
    return { left, width };
  };

  const milestoneLeft = (isoDate) => {
    const d = parseDate(isoDate);
    if (!d) return null;
    return ((d - range.min) / DAY_MS) * PX_PER_DAY;
  };

  const toggleCollapsed = (entityId) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) next.delete(entityId);
      else next.add(entityId);
      return next;
    });
  };

  const hasAnyItems = programs.length > 0 || initiatives.length > 0 || tasks.length > 0
    || hypercareRows.length > 0 || comms.length > 0;

  return (
    <div className="flex-1 p-6 max-w-[1400px] w-full mx-auto overflow-hidden flex flex-col" style={BODY}>
      <div className="mb-4 shrink-0">
        <div
          className="rounded-3xl p-5 mb-3"
          style={{ background: `linear-gradient(120deg, ${tint(COLOR_PROGRAM, '16')}, ${tint(COLOR_TASK, '12')})` }}
        >
          <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>
            Schedule — {activeWorkspace?.name}
          </h2>
          <p className="text-sm" style={{ color: C.sub }}>
            Gantt view of Program, Initiative, Task, and Hypercare timelines, with Comms and Go Live milestones.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: tint(COLOR_PROGRAM, '18'), color: COLOR_PROGRAM }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_PROGRAM }} /> Programs
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: tint(COLOR_INITIATIVE, '18'), color: COLOR_INITIATIVE }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_INITIATIVE }} /> Initiatives
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: tint(COLOR_TASK, '18'), color: COLOR_TASK }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_TASK }} /> Tasks
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: tint(COLOR_HYPERCARE, '18'), color: COLOR_HYPERCARE }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_HYPERCARE }} /> Hypercare
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: tint(COLOR_GO_LIVE, '18'), color: COLOR_GO_LIVE }}>
            <span className="inline-block w-2 h-2" style={{ background: COLOR_GO_LIVE, transform: 'rotate(45deg)' }} /> Go Live
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: tint(COLOR_COMMS, '28'), color: C.navy }}>
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COLOR_COMMS, border: `1.5px solid ${C.navy}` }} /> Comms
          </span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: C.sub }}>Loading…</p>
      ) : !hasAnyItems ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: tint(COLOR_PROGRAM, '16') }}>
            <CalendarRange size={20} style={{ color: COLOR_PROGRAM }} />
          </div>
          <div className="text-sm" style={{ color: C.sub }}>
            Add Programs, Initiatives, Tasks, Hypercare, and Comms with dates to populate the Gantt.
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-white rounded-2xl border shadow-sm overflow-auto" style={{ borderColor: C.border }}>
          <div style={{ minWidth: LABEL_W + timelineWidth }}>
            <div className="flex sticky top-0 z-20 border-b" style={{ borderColor: C.border, background: C.bg, height: 44 }}>
              <div
                className="shrink-0 px-3 flex items-center text-[11px] font-bold uppercase sticky left-0 z-30 border-r"
                style={{ width: LABEL_W, color: C.sub, borderColor: C.border, background: C.bg }}
              >
                Name
              </div>
              <div className="relative" style={{ width: timelineWidth }}>
                {weekTicks.map((t) => {
                  const left = ((t - range.min) / DAY_MS) * PX_PER_DAY;
                  return (
                    <div
                      key={t.toISOString()}
                      className="absolute top-0 bottom-0 border-l px-1 pt-2 text-[10px] font-semibold"
                      style={{ left, borderColor: C.border, color: C.sub }}
                    >
                      {formatShort(t)}
                    </div>
                  );
                })}
              </div>
            </div>

            {treeRows.map((row, idx) => {
              const bar = barStyle(row);
              const isCollapsed = collapsed.has(row.entityId);
              const padLeft = 8 + row.depth * 16;
              const goLiveX = row.goLive ? milestoneLeft(row.goLive) : null;

              return (
                <div
                  key={row.id}
                  className="flex border-b"
                  style={{ borderColor: C.border, height: ROW_H, background: idx % 2 ? tint(C.purple, '04') : '#fff' }}
                >
                  <div
                    className="shrink-0 flex items-center sticky left-0 z-10 border-r min-w-0"
                    style={{
                      width: LABEL_W,
                      borderColor: C.border,
                      background: idx % 2 ? '#fafafa' : '#fff',
                      paddingLeft: padLeft,
                      paddingRight: 8,
                    }}
                  >
                    {row.collapsible ? (
                      <button
                        type="button"
                        aria-label={isCollapsed ? `Expand ${row.name}` : `Collapse ${row.name}`}
                        aria-expanded={!isCollapsed}
                        onClick={() => toggleCollapsed(row.entityId)}
                        className="shrink-0 mr-1 p-0.5 rounded hover:bg-black/5"
                        style={{ color: C.sub }}
                      >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </button>
                    ) : (
                      <span className="shrink-0 mr-1 w-[18px]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate" style={{ color: C.ink }}>{row.name}</div>
                      <div className="text-[10px]" style={{ color: C.sub }}>{row.kind}</div>
                    </div>
                  </div>
                  <div className="relative" style={{ width: timelineWidth }}>
                    {weekTicks.map((t) => {
                      const left = ((t - range.min) / DAY_MS) * PX_PER_DAY;
                      return (
                        <div
                          key={`${row.id}-${t.toISOString()}`}
                          className="absolute top-0 bottom-0 border-l"
                          style={{ left, borderColor: C.border, opacity: 0.7 }}
                        />
                      );
                    })}
                    {bar && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-5 rounded-md shadow-sm"
                        style={{
                          left: bar.left,
                          width: Math.max(bar.width, 8),
                          background: row.color,
                        }}
                        title={`${row.name}: ${row.start} → ${row.end}`}
                      />
                    )}
                    {goLiveX != null && (
                      <div
                        className="absolute top-1/2 z-[5]"
                        style={{ left: goLiveX, transform: 'translate(-50%, -50%)' }}
                        title={`Go Live: ${formatFullDate(row.goLive)}`}
                      >
                        <span
                          className="block"
                          style={{
                            width: 11,
                            height: 11,
                            background: COLOR_GO_LIVE,
                            transform: 'rotate(45deg)',
                            border: '2px solid #fff',
                            boxShadow: '0 0 0 1px rgba(15, 22, 51, 0.25)',
                          }}
                          aria-label={`Go Live: ${formatFullDate(row.goLive)}`}
                        />
                      </div>
                    )}
                    {(row.comms || []).map((c, cIdx) => {
                      const x = milestoneLeft(c.delivery_date);
                      if (x == null) return null;
                      const offsetY = (cIdx % 3) * 3 - 3;
                      return (
                        <div
                          key={c.id}
                          className="absolute z-[6]"
                          style={{
                            left: x,
                            top: `calc(50% + ${offsetY}px)`,
                            transform: 'translate(-50%, -50%)',
                          }}
                          title={`Comms: ${excerpt(c.key_message)}`}
                        >
                          <span
                            className="block rounded-full"
                            style={{
                              width: 10,
                              height: 10,
                              background: COLOR_COMMS,
                              border: `2px solid ${C.navy}`,
                              boxShadow: '0 0 0 1px rgba(28, 47, 143, 0.2)',
                            }}
                            aria-label={`Comms: ${excerpt(c.key_message)}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
