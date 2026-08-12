import { useEffect, useMemo, useState } from 'react';
import { Circle, CircleDot, AlertTriangle } from 'lucide-react';
import { SEVERITY_COLOR } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import {
  ListPageShell, ListTopBar, StatusFilterRow, GroupSection, CompactListCard,
  ListBody, countByStatus, statusColor,
} from '../ui/ListChrome';

const SEVERITIES = [
  { key: 'low', label: 'Low', icon: Circle },
  { key: 'medium', label: 'Medium', icon: CircleDot },
  { key: 'high', label: 'High', icon: AlertTriangle },
];

const RANK = { low: 1, medium: 2, high: 3 };

function peakSeverity(imp) {
  const values = [
    imp.severity_org,
    imp.severity_people,
    imp.severity_process,
    imp.severity_system,
    imp.severity_environment,
  ].filter(Boolean);
  if (!values.length) return 'low';
  return values.reduce((best, cur) => ((RANK[cur] || 0) > (RANK[best] || 0) ? cur : best), 'low');
}

export default function ImpactsPanel({ onOpenInitiative }) {
  const { activeWorkspaceId } = useWorkspace();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null);

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
        peak: peakSeverity(imp),
      })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  const getStatus = (imp) => imp.peak || 'low';
  const counts = countByStatus(rows, getStatus, SEVERITIES.map((s) => s.key));

  const filtered = useMemo(
    () => (statusFilter ? rows.filter((r) => getStatus(r) === statusFilter) : rows),
    [rows, statusFilter],
  );

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((imp) => {
      const key = imp.initiative_id || 'none';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(imp);
    });
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: items[0]?.initiativeName || 'No Initiative',
      items,
    }));
  }, [filtered]);

  return (
    <ListPageShell>
      <ListTopBar
        title="Impacts"
        addLabel="Add Impact"
        onAdd={() => {}}
        addDisabled
      />
      <StatusFilterRow
        statuses={SEVERITIES}
        counts={counts}
        active={statusFilter}
        onSelect={setStatusFilter}
      />
      <ListBody
        empty={!loading && filtered.length === 0}
        emptyText={loading ? 'Loading…' : 'No impacts yet. Add them inside an Initiative.'}
      >
        {groups.map((g) => (
          <GroupSection
            key={g.key}
            title={g.label}
            items={g.items}
            getStatus={getStatus}
          >
            {g.items.map((imp) => {
              const severityTags = Object.entries({
                org: imp.severity_org,
                people: imp.severity_people,
                process: imp.severity_process,
                system: imp.severity_system,
                env: imp.severity_environment,
              })
                .filter(([, v]) => v)
                .slice(0, 3)
                .map(([k, v]) => ({ label: `${k}:${v}`, color: SEVERITY_COLOR[v] || statusColor(v) }));

              return (
                <CompactListCard
                  key={imp.id}
                  title={`${imp.departmentName} · ${imp.headcount_impacted || 0} impacted`}
                  subtitle={imp.impact_description || 'No description'}
                  tags={[
                    { label: getStatus(imp), color: statusColor(getStatus(imp)) },
                    ...severityTags,
                  ]}
                  onClick={() => onOpenInitiative?.(imp.initiative_id)}
                />
              );
            })}
          </GroupSection>
        ))}
      </ListBody>
    </ListPageShell>
  );
}
