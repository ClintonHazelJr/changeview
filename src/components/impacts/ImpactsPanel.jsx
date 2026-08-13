import { useEffect, useMemo, useState } from 'react';
import { Circle, CircleDot, AlertTriangle } from 'lucide-react';
import { SEVERITY_COLOR, isRatedSeverity } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import ListTable from '../ui/ListTable';
import StatusPill from '../ui/StatusPill';
import {
  ListPageShell, ListTopBar, StatusFilterRow, GroupSection, CompactListCard,
  ListBody, countByStatus, statusColor,
} from '../ui/ListChrome';

const SEVERITIES = [
  { key: 'low', label: 'Low', icon: Circle },
  { key: 'medium', label: 'Medium', icon: CircleDot },
  { key: 'high', label: 'High', icon: AlertTriangle },
];

const RANK = { none: 0, low: 1, medium: 2, high: 3 };

function peakSeverity(imp) {
  const values = [
    imp.severity_org,
    imp.severity_people,
    imp.severity_process,
    imp.severity_system,
    imp.severity_environment,
  ].filter(isRatedSeverity);
  if (!values.length) return 'none';
  return values.reduce((best, cur) => ((RANK[cur] || 0) > (RANK[best] || 0) ? cur : best), 'low');
}

export default function ImpactsPanel({ onOpenInitiative }) {
  const { activeWorkspaceId } = useWorkspace();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null);
  const [viewMode, setViewMode] = useState('tiles');

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

  const columns = [
    {
      key: 'departmentName',
      label: 'Department',
      sortable: true,
      render: (imp) => <span className="font-semibold">{imp.departmentName}</span>,
    },
    {
      key: 'initiativeName',
      label: 'Initiative',
      sortable: true,
    },
    {
      key: 'peak',
      label: 'Severity',
      sortable: true,
      sortValue: (imp) => RANK[getStatus(imp)] || 0,
      render: (imp) => <StatusPill label={getStatus(imp)} color={statusColor(getStatus(imp))} />,
    },
    {
      key: 'headcount_impacted',
      label: 'Headcount',
      sortable: true,
      sortValue: (imp) => Number(imp.headcount_impacted) || 0,
      render: (imp) => imp.headcount_impacted || 0,
    },
    {
      key: 'impact_description',
      label: 'Description',
      sortable: true,
      className: 'max-w-sm',
      render: (imp) => <span className="line-clamp-2">{imp.impact_description || '—'}</span>,
    },
  ];

  return (
    <ListPageShell>
      <ListTopBar
        title="Impacts"
        addLabel="Add Impact"
        onAdd={() => {}}
        addDisabled
        viewMode={viewMode}
        onViewChange={setViewMode}
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
        {viewMode === 'list' ? (
          <ListTable
            columns={columns}
            rows={filtered}
            onRowClick={(imp) => onOpenInitiative?.(imp.initiative_id)}
            initialSortKey="departmentName"
          />
        ) : (
          groups.map((g) => (
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
                  .filter(([, v]) => isRatedSeverity(v))
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
          ))
        )}
      </ListBody>
    </ListPageShell>
  );
}
