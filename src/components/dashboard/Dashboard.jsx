import { useEffect, useState } from 'react';
import { LayoutGrid, AlertTriangle, ClipboardList, ChevronRight, X, Sparkles } from 'lucide-react';
import { C, HEAD, BODY, SEVERITY_COLOR, tint, STATUS_COLOR, PLAN_LABELS, isSoloPlan } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const NUDGE_SESSION_KEY = 'cv_solo_upgrade_nudge_dismissed';

export default function Dashboard({ onOpenInitiative, onUpgrade }) {
  const { activeWorkspace, activeWorkspaceId, planTier, hasPaidFeatures, trialActive } = useWorkspace();
  const [stats, setStats] = useState({
    byStatus: {},
    bySeverity: { none: 0, low: 0, medium: 0, high: 0 },
    openRequirements: 0,
    recent: [],
  });
  const [loading, setLoading] = useState(true);
  const [nudgeDismissed, setNudgeDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(NUDGE_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });

  const showSoloNudge = isSoloPlan(planTier) && !hasPaidFeatures && !trialActive && !nudgeDismissed;

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

      const bySeverity = { none: 0, low: 0, medium: 0, high: 0 };
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

  const dismissNudge = () => {
    setNudgeDismissed(true);
    try {
      sessionStorage.setItem(NUDGE_SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const cards = [
    { label: 'Planning', count: stats.byStatus.planning || 0, icon: LayoutGrid, color: C.purple },
    { label: 'Delivery', count: stats.byStatus.delivery || 0, icon: LayoutGrid, color: C.teal },
    { label: 'High severity', count: stats.bySeverity.high || 0, icon: AlertTriangle, color: C.coral },
    { label: 'Open requirements', count: stats.openRequirements, icon: ClipboardList, color: C.amber },
  ];

  return (
    <div className="flex-1 p-8 max-w-5xl w-full mx-auto overflow-y-auto" style={BODY}>
      <div
        className="rounded-3xl p-6 mb-7"
        style={{ background: `linear-gradient(120deg, ${tint(C.purple, '14')}, ${tint(C.teal, '12')})` }}
      >
        <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>
          Dashboard — {activeWorkspace?.name}
        </h2>
        <p className="text-sm" style={{ color: C.sub }}>A snapshot of change work in this workspace.</p>
      </div>

      {showSoloNudge && (
        <div
          className="mb-6 rounded-2xl border px-4 py-3 flex flex-wrap items-start gap-3"
          style={{ borderColor: tint(C.purple, '40'), background: tint(C.purple, '10') }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: tint(C.purple, '18') }}
          >
            <Sparkles size={16} style={{ color: C.purple }} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-semibold mb-0.5" style={{ color: C.ink }}>
              See your whole program on one timeline
            </p>
            <p className="text-xs" style={{ color: C.sub }}>
              Upgrade to {PLAN_LABELS.small} to unlock Schedule and Tasks — plus Heat Map, Change Readiness,
              and more reports.
            </p>
            {onUpgrade && (
              <button
                type="button"
                onClick={onUpgrade}
                className="mt-2 text-xs font-bold underline"
                style={{ color: C.purple }}
              >
                Upgrade to {PLAN_LABELS.small}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={dismissNudge}
            className="p-1 rounded-lg shrink-0"
            style={{ color: C.sub }}
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

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

          <h3 className="text-sm font-bold mb-3" style={{ ...HEAD, color: C.ink }}>Impact severity marks</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { key: 'none', label: 'No Impact' },
              { key: 'low', label: 'Low' },
              { key: 'medium', label: 'Medium' },
              { key: 'high', label: 'High' },
            ].map(({ key, label }) => (
              <div key={key} className="bg-white rounded-2xl p-4 border shadow-sm" style={{ borderColor: C.border }}>
                <div className="text-[11px] font-semibold uppercase mb-1" style={{ color: C.sub }}>{label}</div>
                <div className="text-xl font-extrabold" style={{ color: SEVERITY_COLOR[key] }}>{stats.bySeverity[key] || 0}</div>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-bold mb-3" style={{ ...HEAD, color: C.ink }}>Recently updated initiatives</h3>
          {stats.recent.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
              <div className="text-sm" style={{ color: C.sub }}>No initiatives yet.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {stats.recent.map((i) => {
                const statusColor = STATUS_COLOR[i.status] || C.sub;
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => onOpenInitiative?.(i.id)}
                    className="w-full bg-white rounded-2xl p-4 border shadow-sm flex items-center justify-between text-left hover:shadow-md transition-shadow"
                    style={{ borderColor: C.border }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate mb-1.5" style={{ color: C.ink }}>{i.name}</div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: tint(statusColor, '22'), color: statusColor }}
                      >
                        {i.status}
                      </span>
                    </div>
                    <ChevronRight size={16} className="shrink-0" style={{ color: C.sub }} />
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
