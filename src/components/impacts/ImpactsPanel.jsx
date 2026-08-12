import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { C, HEAD, BODY, tint, SEVERITY_COLOR } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';

export default function ImpactsPanel({ onOpenInitiative }) {
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
      const [{ data: impacts }, { data: initiatives }, { data: departments }] = await Promise.all([
        supabase.from('impacts').select('*').eq('workspace_id', activeWorkspaceId).order('created_at', { ascending: false }),
        supabase.from('initiatives').select('id, name').eq('workspace_id', activeWorkspaceId),
        supabase.from('departments').select('id, name').eq('workspace_id', activeWorkspaceId),
      ]);
      if (cancelled) return;
      const initMap = Object.fromEntries((initiatives || []).map((i) => [i.id, i.name]));
      const deptMap = Object.fromEntries((departments || []).map((d) => [d.id, d.name]));
      setRows((impacts || []).map((imp) => ({
        ...imp,
        initiativeName: initMap[imp.initiative_id] || '—',
        departmentName: deptMap[imp.department_id] || '—',
      })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  return (
    <div className="flex-1 p-8 max-w-4xl w-full mx-auto overflow-y-auto" style={BODY}>
      <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Impacts — {activeWorkspace?.name}</h2>
      <p className="text-sm mb-5" style={{ color: C.sub }}>Every impact across all Initiatives in this workspace.</p>

      {loading ? (
        <p className="text-sm" style={{ color: C.sub }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-dashed" style={{ borderColor: C.border }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: tint(C.coral, '16') }}>
            <AlertTriangle size={20} style={{ color: C.coral }} />
          </div>
          <div className="text-sm" style={{ color: C.sub }}>No impacts yet.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((imp) => {
            const severity = {
              org: imp.severity_org,
              people: imp.severity_people,
              process: imp.severity_process,
              system: imp.severity_system,
              environment: imp.severity_environment,
            };
            return (
              <button
                key={imp.id}
                type="button"
                onClick={() => onOpenInitiative?.(imp.initiative_id)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm border text-left hover:shadow-md transition-shadow"
                style={{ borderColor: C.border }}
              >
                <div className="text-sm font-bold mb-1" style={{ color: C.ink }}>
                  {imp.departmentName} · {imp.headcount_impacted || 0} impacted
                </div>
                <div className="text-xs mb-2" style={{ color: C.sub }}>{imp.initiativeName}</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {Object.entries(severity).map(([k, v]) => v && (
                    <span key={k} className="text-[10px] font-semibold px-2 py-1 rounded-full capitalize" style={{ background: tint(SEVERITY_COLOR[v], '22'), color: SEVERITY_COLOR[v] }}>
                      {k}: {v}
                    </span>
                  ))}
                </div>
                <p className="text-xs" style={{ color: C.sub }}>{imp.impact_description || '—'}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
