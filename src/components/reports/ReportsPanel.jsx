import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { C, HEAD, BODY, SEVERITY_COLOR } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';

export default function ReportsPanel() {
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const [report, setReport] = useState({
    initiativesByStatus: {},
    impactsBySeverity: { none: 0, low: 0, medium: 0, high: 0 },
    requirementsByStatus: {},
    costByProgram: [],
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
      const [initiatives, impacts, requirements, programs, costs] = await Promise.all([
        supabase.from('initiatives').select('id, status, program_id').eq('workspace_id', ws),
        supabase.from('impacts').select('severity_org, severity_people, severity_process, severity_system, severity_environment').eq('workspace_id', ws),
        supabase.from('requirements').select('status').eq('workspace_id', ws),
        supabase.from('programs').select('id, name').eq('workspace_id', ws),
        supabase.from('cost_entries').select('amount, initiative_id').eq('workspace_id', ws).eq('billable', true),
      ]);
      if (cancelled) return;

      const initiativesByStatus = {};
      (initiatives.data || []).forEach((i) => {
        initiativesByStatus[i.status] = (initiativesByStatus[i.status] || 0) + 1;
      });

      const impactsBySeverity = { none: 0, low: 0, medium: 0, high: 0 };
      (impacts.data || []).forEach((imp) => {
        ['severity_org', 'severity_people', 'severity_process', 'severity_system', 'severity_environment'].forEach((k) => {
          const v = imp[k];
          if (v && impactsBySeverity[v] != null) impactsBySeverity[v] += 1;
        });
      });

      const requirementsByStatus = {};
      (requirements.data || []).forEach((r) => {
        requirementsByStatus[r.status] = (requirementsByStatus[r.status] || 0) + 1;
      });

      const initToProgram = Object.fromEntries((initiatives.data || []).map((i) => [i.id, i.program_id]));
      const programName = Object.fromEntries((programs.data || []).map((p) => [p.id, p.name]));
      const costMap = {};
      (costs.data || []).forEach((c) => {
        const programId = initToProgram[c.initiative_id];
        if (!programId) return;
        costMap[programId] = (costMap[programId] || 0) + Number(c.amount || 0);
      });
      const costByProgram = Object.entries(costMap).map(([id, amount]) => ({
        id,
        name: programName[id] || 'Program',
        amount,
      })).sort((a, b) => b.amount - a.amount);

      setReport({ initiativesByStatus, impactsBySeverity, requirementsByStatus, costByProgram });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  const statusCards = Object.entries(report.initiativesByStatus);
  const reqCards = Object.entries(report.requirementsByStatus);

  return (
    <div className="flex-1 p-8 max-w-5xl w-full mx-auto overflow-y-auto" style={BODY}>
      <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Reports — {activeWorkspace?.name}</h2>
      <p className="text-sm mb-6" style={{ color: C.sub }}>Live aggregations from Initiatives, Impacts, Requirements, and cost entries.</p>

      {loading ? (
        <p className="text-sm" style={{ color: C.sub }}>Loading…</p>
      ) : (
        <>
          <h3 className="text-sm font-bold mb-3" style={{ ...HEAD, color: C.ink }}>Initiatives by status</h3>
          {statusCards.length === 0 ? (
            <p className="text-sm mb-6" style={{ color: C.sub }}>No initiatives.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {statusCards.map(([status, count]) => (
                <div key={status} className="rounded-3xl p-4 text-white" style={{ background: C.purple }}>
                  <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center mb-3"><BarChart3 size={15} /></div>
                  <div className="text-2xl font-extrabold" style={HEAD}>{count}</div>
                  <div className="text-xs font-medium opacity-90 capitalize">{status}</div>
                </div>
              ))}
            </div>
          )}

          <h3 className="text-sm font-bold mb-3" style={{ ...HEAD, color: C.ink }}>Impacts by severity (all categories)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { key: 'none', label: 'No Impact' },
              { key: 'low', label: 'Low' },
              { key: 'medium', label: 'Medium' },
              { key: 'high', label: 'High' },
            ].map(({ key, label }) => (
              <div key={key} className="bg-white rounded-2xl p-4 border shadow-sm" style={{ borderColor: C.border }}>
                <div className="text-[11px] font-semibold uppercase mb-1" style={{ color: C.sub }}>{label}</div>
                <div className="text-2xl font-extrabold" style={{ color: SEVERITY_COLOR[key] }}>{report.impactsBySeverity[key]}</div>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-bold mb-3" style={{ ...HEAD, color: C.ink }}>Requirements by status</h3>
          {reqCards.length === 0 ? (
            <p className="text-sm mb-6" style={{ color: C.sub }}>No requirements.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 mb-8">
              {reqCards.map(([status, count]) => (
                <div key={status} className="rounded-3xl p-4 text-white" style={{ background: C.amber }}>
                  <div className="text-2xl font-extrabold" style={HEAD}>{count}</div>
                  <div className="text-xs font-medium opacity-90 capitalize">{status}</div>
                </div>
              ))}
            </div>
          )}

          <h3 className="text-sm font-bold mb-3" style={{ ...HEAD, color: C.ink }}>Cost roll-up by Program</h3>
          {report.costByProgram.length === 0 ? (
            <div className="text-sm bg-white rounded-2xl p-4 border" style={{ color: C.sub, borderColor: C.border }}>
              No billable cost entries yet.
            </div>
          ) : (
            <div className="space-y-2">
              {report.costByProgram.map((row) => (
                <div key={row.id} className="bg-white rounded-2xl p-4 border shadow-sm flex items-center justify-between" style={{ borderColor: C.border }}>
                  <div className="text-sm font-bold" style={{ color: C.ink }}>{row.name}</div>
                  <div className="text-sm font-extrabold" style={{ color: C.teal }}>
                    ${row.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
