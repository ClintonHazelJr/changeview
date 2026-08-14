import { useEffect, useMemo, useState } from 'react';
import { CircleDot, Rocket, CheckCircle2 } from 'lucide-react';
import { usePrograms } from '../../hooks/usePrograms';
import Modal from '../ui/Modal';
import { FormProgram } from '../forms/AdminForms';
import ListTable from '../ui/ListTable';
import StatusPill from '../ui/StatusPill';
import {
  ListPageShell, ListTopBar, StatusFilterRow, GroupSection, CompactListCard,
  ListBody, countByStatus, statusColor,
} from '../ui/ListChrome';

const STATUSES = [
  { key: 'planning', label: 'Planning', icon: CircleDot },
  { key: 'delivery', label: 'Delivery', icon: Rocket },
  { key: 'closed', label: 'Closed', icon: CheckCircle2 },
];

function formatDate(value) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProgramsPanel({ initialProgramId = null, onProgramFocusConsumed }) {
  const { programs, orgs, addProgram, updateProgram } = usePrograms();
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [viewMode, setViewMode] = useState('tiles');

  const orgName = (id) => orgs.find((o) => o.id === id)?.name || 'Unassigned org';
  const getStatus = (p) => p.status || 'planning';
  const counts = countByStatus(programs, getStatus, STATUSES.map((s) => s.key));

  const filtered = useMemo(
    () => (statusFilter ? programs.filter((p) => getStatus(p) === statusFilter) : programs),
    [programs, statusFilter],
  );

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((p) => {
      const key = p.organization_id || 'none';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: key === 'none' ? 'No Org' : orgName(key),
      items,
    }));
  }, [filtered, orgs]);

  const openAdd = () => { setEditing(null); setModal('program'); };
  const openEdit = (p) => { setEditing(p); setModal('program'); };

  useEffect(() => {
    if (!initialProgramId || !programs.length) return;
    const match = programs.find((p) => p.id === initialProgramId);
    if (match) openEdit(match);
    onProgramFocusConsumed?.();
  }, [initialProgramId, programs]);

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (p) => <span className="font-semibold">{p.name}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      sortValue: (p) => getStatus(p),
      render: (p) => <StatusPill label={getStatus(p)} color={statusColor(getStatus(p))} />,
    },
    {
      key: 'org',
      label: 'Org',
      sortable: true,
      sortValue: (p) => orgName(p.organization_id),
      render: (p) => orgName(p.organization_id),
    },
    {
      key: 'proposed_go_live_date',
      label: 'Go live',
      sortable: true,
      render: (p) => formatDate(p.proposed_go_live_date) || '—',
    },
    {
      key: 'budget',
      label: 'Budget',
      sortable: true,
      sortValue: (p) => Number(p.budget) || 0,
      render: (p) => (p.budget != null && p.budget !== '' ? `$${Number(p.budget).toLocaleString()}` : '—'),
    },
  ];

  return (
    <ListPageShell>
      <ListTopBar
        title="Program"
        addLabel="Add Program"
        onAdd={openAdd}
        addDisabled={orgs.length === 0}
        viewMode={viewMode}
        onViewChange={setViewMode}
      />
      <StatusFilterRow
        statuses={STATUSES}
        counts={counts}
        active={statusFilter}
        onSelect={setStatusFilter}
        onAddStatus={orgs.length ? openAdd : undefined}
      />
      <ListBody empty={filtered.length === 0} emptyText={orgs.length === 0 ? 'Add an Org in Settings first.' : 'No programs yet.'}>
        {viewMode === 'list' ? (
          <ListTable
            columns={columns}
            rows={filtered}
            onRowClick={openEdit}
            initialSortKey="name"
            emptyText="No programs yet."
          />
        ) : (
          groups.map((g) => (
            <GroupSection
              key={g.key}
              title={g.label}
              items={g.items}
              getStatus={getStatus}
              addLabel="Add Program"
              onAdd={orgs.length ? openAdd : undefined}
            >
              {g.items.map((p) => (
                <CompactListCard
                  key={p.id}
                  title={p.name}
                  subtitle={[formatDate(p.proposed_go_live_date) && `Go live ${formatDate(p.proposed_go_live_date)}`, p.budget != null && p.budget !== '' ? `$${Number(p.budget).toLocaleString()}` : null].filter(Boolean).join(' · ') || 'No go-live date'}
                  tags={[
                    { label: getStatus(p), color: statusColor(getStatus(p)) },
                  ]}
                  onClick={() => openEdit(p)}
                />
              ))}
            </GroupSection>
          ))
        )}
      </ListBody>

      {modal === 'program' && (
        <Modal title={editing ? 'Edit Program' : 'Add Program'} onClose={() => setModal(null)} wide>
          <FormProgram
            orgs={orgs}
            initial={editing}
            onSave={async (vals) => {
              if (editing) await updateProgram(editing.id, vals);
              else await addProgram(vals);
              setModal(null);
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </ListPageShell>
  );
}
