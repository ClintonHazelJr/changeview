import { useEffect, useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
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

const DAY_MS = 86400000;
const ROW_H = 40;
const LABEL_W = 240;
const PX_PER_DAY = 14;

export default function SchedulePanel() {
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeWorkspaceId) {
        setRows([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const [{ data: programs }, { data: initiatives }] = await Promise.all([
        supabase.from('programs').select('id, name, start_date, proposed_go_live_date').eq('workspace_id', activeWorkspaceId).order('name'),
        supabase.from('initiatives').select('id, name, start_date, proposed_go_live_date, program_id').eq('workspace_id', activeWorkspaceId).order('name'),
      ]);
      if (cancelled) return;

      const list = [];
      (programs || []).forEach((p) => {
        list.push({
          id: `program-${p.id}`,
          name: p.name,
          kind: 'Program',
          start: p.start_date,
          end: p.proposed_go_live_date || p.start_date,
          color: C.teal,
        });
      });
      (initiatives || []).forEach((i) => {
        list.push({
          id: `initiative-${i.id}`,
          name: i.name,
          kind: 'Initiative',
          start: i.start_date,
          end: i.proposed_go_live_date || i.start_date,
          color: C.coral,
        });
      });
      setRows(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  const datedRows = useMemo(
    () => rows.filter((r) => parseDate(r.start) || parseDate(r.end)),
    [rows],
  );

  const range = useMemo(() => {
    const dates = [];
    datedRows.forEach((r) => {
      const s = parseDate(r.start);
      const e = parseDate(r.end);
      if (s) dates.push(s);
      if (e) dates.push(e);
    });
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
  }, [datedRows]);

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
    const s = parseDate(row.start) || parseDate(row.end);
    const e = parseDate(row.end) || parseDate(row.start);
    if (!s || !e) return null;
    const left = ((s - range.min) / DAY_MS) * PX_PER_DAY;
    const spanDays = Math.max(1, Math.round((e - s) / DAY_MS) + 1);
    const width = spanDays * PX_PER_DAY;
    return { left, width };
  };

  return (
    <div className="flex-1 p-6 max-w-[1400px] w-full mx-auto overflow-hidden flex flex-col" style={BODY}>
      <div className="mb-4 shrink-0">
        <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>
          Schedule — {activeWorkspace?.name}
        </h2>
        <p className="text-sm mb-3" style={{ color: C.sub }}>
          Gantt view of Program and Initiative timelines (start → go-live). Display only.
        </p>
        <div className="flex gap-4 text-xs font-semibold" style={{ color: C.sub }}>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm" style={{ background: C.teal }} /> Programs</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm" style={{ background: C.coral }} /> Initiatives</span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: C.sub }}>Loading…</p>
      ) : datedRows.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: tint(C.teal, '16') }}>
            <CalendarRange size={20} style={{ color: C.teal }} />
          </div>
          <div className="text-sm" style={{ color: C.sub }}>Add start and go-live dates on Programs and Initiatives to populate the Gantt.</div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-white rounded-2xl border shadow-sm overflow-auto" style={{ borderColor: C.border }}>
          <div style={{ minWidth: LABEL_W + timelineWidth }}>
            {/* Header */}
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

            {/* Rows */}
            {datedRows.map((row, idx) => {
              const bar = barStyle(row);
              return (
                <div
                  key={row.id}
                  className="flex border-b"
                  style={{ borderColor: C.border, height: ROW_H, background: idx % 2 ? tint(C.purple, '04') : '#fff' }}
                >
                  <div
                    className="shrink-0 px-3 flex flex-col justify-center sticky left-0 z-10 border-r min-w-0"
                    style={{ width: LABEL_W, borderColor: C.border, background: idx % 2 ? '#fafafa' : '#fff' }}
                  >
                    <div className="text-xs font-bold truncate" style={{ color: C.ink }}>{row.name}</div>
                    <div className="text-[10px]" style={{ color: C.sub }}>{row.kind}</div>
                  </div>
                  <div className="relative" style={{ width: timelineWidth }}>
                    {weekTicks.map((t) => {
                      const left = ((t - range.min) / DAY_MS) * PX_PER_DAY;
                      return (
                        <div
                          key={`${row.id}-${t.toISOString()}`}
                          className="absolute top-0 bottom-0 border-l"
                          style={{ left, borderColor: tint(C.border, 'ff') === C.border ? C.border : C.border, opacity: 0.7 }}
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
                        title={`${row.name}: ${row.start || '—'} → ${row.end || '—'}`}
                      />
                    )}
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
