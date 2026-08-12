import { useEffect, useState } from 'react';
import { LayoutGrid, AlertTriangle, ClipboardList, ChevronRight } from 'lucide-react';
import { C, HEAD, BODY, SEVERITY_COLOR } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';

export default function Dashboard({ onOpenInitiative }) {
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const [stats, setStats] = useState({
    byStatus: {},
    bySeverity: { low: 0, medium: 0, high: 0 },
    openRequirements: 0,
    recent: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeWorkspaceId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const ws = activeWorkspaceId;
      const [initiatives, impacts, requirements] = await Promise.all([
        supabase.from('initiatives').select('id, name, status, updated_at, created_at').eq('workspace_id', ws).order('updated_at', { ascending: false }),
        supabase.from('impacts').select('severity_org, severity_people, severity_process, severity_system, severity_environment').eq('workspace_id', ws),
        supabase.from('requirements').select('id, status').eq('workspace_id', ws),
      ]);
      if (cancelled) return;

      const byStatus = {};
      (initiatives.data || []).forEach((i) => {
        byStatus[i.status] = (byStatus[i.status] || 0) + 1;
      });

      const bySeverity = { low: 0, medium: 0, high: 0 };
      (impacts.data || []).forEach((imp) => {
        ['severity_org', 'severity_people', 'severity_process', 'severity_system', 'severity_environment'].forEach((k) => {
          const v = imp[k];
          if (v && bySeverity[v] != null) bySeverity[v] += 1;
        });
      });

      const openRequirements = (requirements.data || []).filter((r) => r.status === 'draft').length;

      setStats({
        byStatus,
        bySeverity,
        openRequirements,
        recent: (initiatives.data || []).slice(0, 6),
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  const cards = [
    { label: 'Initiatives (planning)', count: stats.byStatus.planning || 0, icon: LayoutGrid, color: C.purple },
    { label: 'Initiatives (delivery)', count: stats.byStatus.delivery || 0, icon: LayoutGrid, color: C.teal },
    { label: 'High severity marks', count: stats.bySeverity.high || 0, icon: AlertTriangle, color: C.coral },
    { label: 'Open requirements', count: stats.openRequirements, icon: ClipboardList, color: C.amber },
  ];

  return (
    <div className="flex-1 p-8 max-w-5xl w-full mx-auto overflow-y-auto" style={BODY}>
      <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Dashboard — {activeWorkspace?.name}</h2>
      <p className="text-sm mb-6" style={{ color: C.sub }}>A snapshot of change work in this workspace.</p>

      {loading ? (
        <p className="text-sm" style={{ color: C.sub }}>Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {cards.map((c) => (
              <div key={c.label} className="rounded-3xl p-4 text-white relative overflow-hidden" style={{ background: c.color }}>
                <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center mb-3">
                  <c.icon size={15} />
                </div>
                <div className="text-2xl font-extrabold" style={HEAD}>{c.count}</div>
                <div className="text-xs font-medium opacity-90">{c.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {['low', 'medium', 'high'].map((sev) => (
              <div key={sev} className="bg-white rounded-2xl p-4 border shadow-sm" style={{ borderColor: C.border }}>
                <div className="text-[11px] font-semibold uppercase mb-1" style={{ color: C.sub }}>Impacts · {sev}</div>
                <div className="text-xl font-extrabold capitalize" style={{ color: SEVERITY_COLOR[sev] }}>{stats.bySeverity[sev]}</div>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-bold mb-3" style={{ ...HEAD, color: C.ink }}>Recently updated initiatives</h3>
          {stats.recent.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
              <div className="text-sm" style={{ color: C.sub }}>No initiatives yet.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recent.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => onOpenInitiative?.(i.id)}
                  className="w-full bg-white rounded-2xl p-4 border shadow-sm flex items-center justify-between text-left hover:shadow-md transition-shadow"
                  style={{ borderColor: C.border }}
                >
                  <div>
                    <div className="text-sm font-bold" style={{ color: C.ink }}>{i.name}</div>
                    <div className="text-xs capitalize" style={{ color: C.sub }}>{i.status}</div>
                  </div>
                  <ChevronRight size={16} style={{ color: C.sub }} />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
