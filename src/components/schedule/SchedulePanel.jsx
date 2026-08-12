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

function formatDate(value) {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SchedulePanel() {
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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
        if (p.start_date) rows.push({ id: `p-start-${p.id}`, label: p.name, kind: 'Program', type: 'Start', date: p.start_date, color: C.teal });
        if (p.proposed_go_live_date) rows.push({ id: `p-live-${p.id}`, label: p.name, kind: 'Program', type: 'Go live', date: p.proposed_go_live_date, color: C.purple });
      });
      (initiatives || []).forEach((i) => {
        if (i.start_date) rows.push({ id: `i-start-${i.id}`, label: i.name, kind: 'Initiative', type: 'Start', date: i.start_date, color: C.amber });
        if (i.proposed_go_live_date) rows.push({ id: `i-live-${i.id}`, label: i.name, kind: 'Initiative', type: 'Go live', date: i.proposed_go_live_date, color: C.coral });
      });
      rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
      setEvents(rows);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  const range = useMemo(() => {
    const dates = events.map((e) => parseDate(e.date)).filter(Boolean);
    if (!dates.length) return null;
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    if (min.getTime() === max.getTime()) max.setDate(max.getDate() + 1);
    return { min, max, span: max.getTime() - min.getTime() };
  }, [events]);

  return (
    <div className="flex-1 p-8 max-w-5xl w-full mx-auto overflow-y-auto" style={BODY}>
      <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Schedule — {activeWorkspace?.name}</h2>
      <p className="text-sm mb-5" style={{ color: C.sub }}>
        Read-only timeline from Program and Initiative start / go-live dates.
      </p>

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
        <div className="space-y-3">
          {events.map((e) => {
            const d = parseDate(e.date);
            const left = range && d ? ((d.getTime() - range.min.getTime()) / range.span) * 100 : 0;
            return (
              <div key={e.id} className="bg-white rounded-2xl p-4 border shadow-sm" style={{ borderColor: C.border }}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-bold" style={{ color: C.ink }}>{e.label}</div>
                    <div className="text-xs" style={{ color: C.sub }}>{e.kind} · {e.type}</div>
                  </div>
                  <div className="text-xs font-semibold" style={{ color: e.color }}>{formatDate(e.date)}</div>
                </div>
                <div className="h-2 rounded-full relative" style={{ background: C.bg }}>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                    style={{ left: `calc(${Math.min(Math.max(left, 0), 100)}% - 6px)`, background: e.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
