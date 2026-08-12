import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { C, HEAD, BODY, tint } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';

function parseDate(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function SchedulePanel() {
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeWorkspaceId) {
        setEvents([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const [{ data: programs }, { data: initiatives }] = await Promise.all([
        supabase.from('programs').select('id, name, start_date, proposed_go_live_date').eq('workspace_id', activeWorkspaceId),
        supabase.from('initiatives').select('id, name, start_date, proposed_go_live_date').eq('workspace_id', activeWorkspaceId),
      ]);
      if (cancelled) return;

      const rows = [];
      (programs || []).forEach((p) => {
        if (p.start_date) {
          rows.push({
            id: `p-start-${p.id}`, label: p.name, kind: 'Program', type: 'Start',
            date: p.start_date, color: C.teal,
          });
        }
        if (p.proposed_go_live_date) {
          rows.push({
            id: `p-live-${p.id}`, label: p.name, kind: 'Program', type: 'Go live',
            date: p.proposed_go_live_date, color: C.purple,
          });
        }
      });
      (initiatives || []).forEach((i) => {
        if (i.start_date) {
          rows.push({
            id: `i-start-${i.id}`, label: i.name, kind: 'Initiative', type: 'Start',
            date: i.start_date, color: C.amber,
          });
        }
        if (i.proposed_go_live_date) {
          rows.push({
            id: `i-live-${i.id}`, label: i.name, kind: 'Initiative', type: 'Go live',
            date: i.proposed_go_live_date, color: C.coral,
          });
        }
      });
      setEvents(rows);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  const byDate = useMemo(() => {
    const map = new Map();
    events.forEach((e) => {
      if (!e.date) return;
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    });
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const startPad = first.getDay(); // 0 Sun
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const list = [];
    for (let i = 0; i < startPad; i += 1) list.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      list.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    }
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayKey = ymd(new Date());

  return (
    <div className="flex-1 p-8 max-w-6xl w-full mx-auto overflow-y-auto" style={BODY}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>
            Schedule — {activeWorkspace?.name}
          </h2>
          <p className="text-sm" style={{ color: C.sub }}>
            One calendar for Program and Initiative start / go-live dates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-xl border bg-white"
            style={{ borderColor: C.border, color: C.ink }}
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-sm font-bold min-w-[140px] text-center" style={{ color: C.ink }}>{monthLabel}</div>
          <button
            type="button"
            className="p-2 rounded-xl border bg-white"
            style={{ borderColor: C.border, color: C.ink }}
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            className="text-xs font-semibold px-3 py-2 rounded-xl border bg-white"
            style={{ borderColor: C.border, color: C.purple }}
            onClick={() => setCursor(startOfMonth(new Date()))}
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-4 text-xs font-semibold" style={{ color: C.sub }}>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: C.teal }} /> Program start</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: C.purple }} /> Program go-live</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: C.amber }} /> Initiative start</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: C.coral }} /> Initiative go-live</span>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: C.sub }}>Loading…</p>
      ) : events.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: tint(C.teal, '16') }}>
            <CalendarRange size={20} style={{ color: C.teal }} />
          </div>
          <div className="text-sm" style={{ color: C.sub }}>No dated Programs or Initiatives yet.</div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden" style={{ borderColor: C.border }}>
          <div className="grid grid-cols-7 border-b" style={{ borderColor: C.border }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="px-2 py-2 text-[11px] font-bold uppercase text-center" style={{ color: C.sub }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) {
                return <div key={`pad-${idx}`} className="min-h-[110px] border-b border-r bg-gray-50/40" style={{ borderColor: C.border }} />;
              }
              const key = ymd(day);
              const dayEvents = byDate.get(key) || [];
              const isToday = key === todayKey;
              return (
                <div
                  key={key}
                  className="min-h-[110px] border-b border-r p-1.5"
                  style={{ borderColor: C.border, background: isToday ? tint(C.purple, '08') : '#fff' }}
                >
                  <div
                    className="text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full"
                    style={{
                      color: isToday ? '#fff' : C.ink,
                      background: isToday ? C.purple : 'transparent',
                    }}
                  >
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className="text-[10px] leading-tight px-1.5 py-1 rounded-md truncate font-semibold"
                        style={{ background: tint(e.color, '22'), color: e.color }}
                        title={`${e.kind} · ${e.type}: ${e.label}`}
                      >
                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: e.color }} />
                        {e.label}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] px-1" style={{ color: C.sub }}>+{dayEvents.length - 3} more</div>
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
