import { useEffect, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { C, HEAD, BODY, tint } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { usePrograms } from '../../hooks/usePrograms';
import { useInitiatives } from '../../hooks/useInitiatives';
import { useTasks } from '../../hooks/useTasks';
import ScheduleGantt, { ScheduleLegend, SCHEDULE_COLORS } from './ScheduleGantt';

export default function SchedulePanel({ onOpenRecord }) {
  const { activeWorkspace, activeWorkspaceId, loading: workspaceLoading } = useWorkspace();
  const { programs, loading: programsLoading } = usePrograms();
  const { initiatives, loading: initiativesLoading } = useInitiatives();
  const { tasks, loading: tasksLoading } = useTasks();
  const [comms, setComms] = useState([]);
  const [hypercareRows, setHypercareRows] = useState([]);
  const [extrasLoading, setExtrasLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (workspaceLoading) return;
      if (!activeWorkspaceId) {
        setComms([]);
        setHypercareRows([]);
        setExtrasLoading(false);
        setLoadError('');
        return;
      }
      setExtrasLoading(true);
      setLoadError('');
      try {
        const [commsRes, hcRes] = await Promise.all([
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
        if (commsRes.error) throw new Error(commsRes.error.message);
        if (hcRes.error) throw new Error(hcRes.error.message);
        setComms(commsRes.data || []);
        setHypercareRows(hcRes.data || []);
      } catch (err) {
        if (!cancelled) {
          setComms([]);
          setHypercareRows([]);
          setLoadError(err.message || 'Could not load schedule milestones');
        }
      } finally {
        if (!cancelled) setExtrasLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeWorkspaceId, workspaceLoading]);

  const loading = workspaceLoading || programsLoading || initiativesLoading || tasksLoading || extrasLoading;
  const hasAnyItems = programs.length > 0 || initiatives.length > 0 || tasks.length > 0
    || hypercareRows.length > 0 || comms.length > 0;

  return (
    <div className="flex-1 p-6 max-w-[1400px] w-full mx-auto overflow-hidden flex flex-col" style={BODY}>
      <div className="mb-4 shrink-0">
        <div
          className="rounded-3xl p-5 mb-3"
          style={{ background: `linear-gradient(120deg, ${tint(SCHEDULE_COLORS.program, '16')}, ${tint(SCHEDULE_COLORS.task, '12')})` }}
        >
          <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>
            Schedule — {activeWorkspace?.name}
          </h2>
          <p className="text-sm" style={{ color: C.sub }}>
            Gantt view of Program, Initiative, Task, and Hypercare timelines, with Comms and Go Live milestones.
          </p>
        </div>
        <ScheduleLegend />
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: C.sub }}>Loading…</p>
      ) : loadError && !hasAnyItems ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
          <div className="text-sm" style={{ color: C.coral }}>{loadError}</div>
        </div>
      ) : !hasAnyItems ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: tint(SCHEDULE_COLORS.program, '16') }}>
            <CalendarRange size={20} style={{ color: SCHEDULE_COLORS.program }} />
          </div>
          <div className="text-sm" style={{ color: C.sub }}>
            Add Programs, Initiatives, Tasks, Hypercare, and Comms with dates to populate the Gantt.
          </div>
        </div>
      ) : (
        <ScheduleGantt
          className="flex-1 min-h-0"
          programs={programs}
          initiatives={initiatives}
          tasks={tasks}
          comms={comms}
          hypercareRows={hypercareRows}
          onOpenRecord={onOpenRecord}
          interactive
        />
      )}
    </div>
  );
}
