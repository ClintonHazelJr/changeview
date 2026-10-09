import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { C, tint, isArchivedRecord } from '../../lib/constants';

export function parseDate(value) {
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

export const SCHEDULE_COLORS = {
  program: C.teal,
  initiative: C.coral,
  task: C.royal,
  hypercare: C.darknavy,
  goLive: C.navy,
  comms: C.blue4,
};

export function ScheduleLegend() {
  const items = [
    { label: 'Programs', color: SCHEDULE_COLORS.program, shape: 'bar' },
    { label: 'Initiatives', color: SCHEDULE_COLORS.initiative, shape: 'bar' },
    { label: 'Tasks', color: SCHEDULE_COLORS.task, shape: 'bar' },
    { label: 'Hypercare', color: SCHEDULE_COLORS.hypercare, shape: 'bar' },
    { label: 'Go Live', color: SCHEDULE_COLORS.goLive, shape: 'diamond' },
    { label: 'Comms', color: SCHEDULE_COLORS.comms, shape: 'dot' },
  ];
  return (
    <div className="flex flex-wrap gap-3 text-xs font-semibold">
      {items.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{
            background: tint(item.color, item.shape === 'dot' ? '28' : '18'),
            color: item.shape === 'dot' ? C.navy : item.color,
          }}
        >
          {item.shape === 'diamond' ? (
            <span className="inline-block w-2 h-2" style={{ background: item.color, transform: 'rotate(45deg)' }} />
          ) : item.shape === 'dot' ? (
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: item.color, border: `1.5px solid ${C.navy}` }}
            />
          ) : (
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function buildScheduleTreeRows({
  programs = [],
  initiatives = [],
  tasks = [],
  comms = [],
  hypercareRows = [],
  collapsed = new Set(),
  expandAll = false,
}) {
  const activePrograms = programs.filter((p) => !isArchivedRecord(p));
  const activeInits = initiatives.filter((i) => !isArchivedRecord(i));
  const initsByProgram = new Map();
  const orphans = [];
  activeInits.forEach((i) => {
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
  const isCollapsed = (id) => !expandAll && collapsed.has(id);

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
      color: SCHEDULE_COLORS.initiative,
      start: init.start_date,
      end: init.proposed_go_live_date,
      goLive: init.proposed_go_live_date || null,
      comms: commsByInit.get(init.id) || [],
    });
    if (isCollapsed(init.id)) return;
    childTasks.forEach((t) => {
      out.push({
        id: `task-${t.id}`,
        entityId: t.id,
        name: t.name,
        kind: 'Task',
        depth: depth + 1,
        collapsible: false,
        color: SCHEDULE_COLORS.task,
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
        initiativeId: init.id,
        name: 'Hypercare',
        kind: 'Hypercare',
        depth: depth + 1,
        collapsible: false,
        color: SCHEDULE_COLORS.hypercare,
        start: hc.start_date,
        end: hc.end_date,
        goLive: null,
        comms: [],
      });
    }
  };

  activePrograms.forEach((p) => {
    const childInits = initsByProgram.get(p.id) || [];
    out.push({
      id: `program-${p.id}`,
      entityId: p.id,
      name: p.name,
      kind: 'Program',
      depth: 0,
      collapsible: childInits.length > 0,
      color: SCHEDULE_COLORS.program,
      start: p.start_date,
      end: p.proposed_go_live_date,
      goLive: null,
      comms: [],
    });
    if (isCollapsed(p.id)) return;
    childInits.forEach((init) => pushInitiative(init, 1));
  });

  orphans.forEach((init) => pushInitiative(init, 0));
  return out;
}

export function computeScheduleRange({
  programs = [],
  initiatives = [],
  tasks = [],
  comms = [],
  hypercareRows = [],
}) {
  const dates = [];
  const consider = (value) => {
    const d = parseDate(value);
    if (d) dates.push(d);
  };
  programs.filter((p) => !isArchivedRecord(p)).forEach((p) => {
    consider(p.start_date);
    consider(p.proposed_go_live_date);
  });
  initiatives.filter((i) => !isArchivedRecord(i)).forEach((i) => {
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
}

/**
 * Shared Gantt used by Schedule screen and Schedule Report / PDF export.
 */
export default function ScheduleGantt({
  programs = [],
  initiatives = [],
  tasks = [],
  comms = [],
  hypercareRows = [],
  onOpenRecord,
  expandAll = false,
  interactive = true,
  /** Use for PDF capture so html2canvas gets the full timeline width. */
  overflowVisible = false,
  className = '',
  style,
}) {
  const [collapsed, setCollapsed] = useState(() => new Set());

  const treeRows = useMemo(
    () => buildScheduleTreeRows({
      programs,
      initiatives,
      tasks,
      comms,
      hypercareRows,
      collapsed,
      expandAll,
    }),
    [programs, initiatives, tasks, comms, hypercareRows, collapsed, expandAll],
  );

  const range = useMemo(
    () => computeScheduleRange({ programs, initiatives, tasks, comms, hypercareRows }),
    [programs, initiatives, tasks, comms, hypercareRows],
  );

  const totalDays = Math.max(1, Math.round((range.max - range.min) / DAY_MS));
  const timelineWidth = totalDays * PX_PER_DAY;

  const weekTicks = useMemo(() => {
    const ticks = [];
    for (let d = new Date(range.min); d < range.max; d = addDays(d, 7)) {
      ticks.push(new Date(d));
    }
    return ticks;
  }, [range]);

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
    if (!interactive || expandAll) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) next.delete(entityId);
      else next.add(entityId);
      return next;
    });
  };

  const openRow = (row) => {
    if (!interactive || !onOpenRecord) return;
    if (row.kind === 'Program') onOpenRecord({ type: 'program', id: row.entityId });
    else if (row.kind === 'Initiative') onOpenRecord({ type: 'initiative', id: row.entityId });
    else if (row.kind === 'Task') onOpenRecord({ type: 'task', id: row.entityId });
    else if (row.kind === 'Hypercare') {
      onOpenRecord({ type: 'hypercare', id: row.entityId, initiativeId: row.initiativeId });
    }
  };

  if (!treeRows.length) return null;

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm ${overflowVisible ? 'overflow-visible' : 'overflow-auto'} ${className}`}
      style={{ borderColor: C.border, ...style }}
    >
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
          const rowCollapsed = !expandAll && collapsed.has(row.entityId);
          const padLeft = 8 + row.depth * 16;
          const goLiveX = row.goLive ? milestoneLeft(row.goLive) : null;
          const canOpen = interactive
            && Boolean(onOpenRecord)
            && ['Program', 'Initiative', 'Task', 'Hypercare'].includes(row.kind);

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
                {row.collapsible && interactive && !expandAll ? (
                  <button
                    type="button"
                    aria-label={rowCollapsed ? `Expand ${row.name}` : `Collapse ${row.name}`}
                    aria-expanded={!rowCollapsed}
                    onClick={() => toggleCollapsed(row.entityId)}
                    className="shrink-0 mr-1 p-0.5 rounded hover:bg-black/5"
                    style={{ color: C.sub }}
                  >
                    {rowCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </button>
                ) : (
                  <span className="shrink-0 mr-1 w-[18px]" />
                )}
                <div className="min-w-0 flex-1">
                  {canOpen ? (
                    <button
                      type="button"
                      onClick={() => openRow(row)}
                      className="text-left w-full min-w-0 group"
                      title={`Open ${row.kind}`}
                    >
                      <div className="text-xs font-bold truncate group-hover:underline" style={{ color: C.ink }}>
                        {row.name}
                      </div>
                      <div className="text-[10px]" style={{ color: C.sub }}>{row.kind}</div>
                    </button>
                  ) : (
                    <>
                      <div className="text-xs font-bold truncate" style={{ color: C.ink }}>{row.name}</div>
                      <div className="text-[10px]" style={{ color: C.sub }}>{row.kind}</div>
                    </>
                  )}
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
                  canOpen ? (
                    <button
                      type="button"
                      onClick={() => openRow(row)}
                      className="absolute top-1/2 -translate-y-1/2 h-5 rounded-md shadow-sm hover:brightness-110 cursor-pointer"
                      style={{
                        left: bar.left,
                        width: Math.max(bar.width, 8),
                        background: row.color,
                      }}
                      title={`Open ${row.name}`}
                      aria-label={`Open ${row.kind}: ${row.name}`}
                    />
                  ) : (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-5 rounded-md shadow-sm"
                      style={{
                        left: bar.left,
                        width: Math.max(bar.width, 8),
                        background: row.color,
                      }}
                      title={`${row.name}: ${row.start} → ${row.end}`}
                    />
                  )
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
                        background: SCHEDULE_COLORS.goLive,
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
                          background: SCHEDULE_COLORS.comms,
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
  );
}
